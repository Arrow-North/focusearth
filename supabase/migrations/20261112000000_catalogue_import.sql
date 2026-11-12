-- Catalogue imports are committed only by the authenticated, super-admin checked Edge Function.
INSERT INTO storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
VALUES ('catalogue-assets','catalogue-assets',true,52428800,ARRAY[
  'image/jpeg','image/png','image/gif','image/webp','application/pdf','text/plain','text/csv',
  'application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/zip'
]) ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public read catalogue assets" ON storage.objects FOR SELECT TO public USING (bucket_id='catalogue-assets');
-- No authenticated INSERT/UPDATE/DELETE policy: import writes use the backend service role.

CREATE TABLE public.catalogue_import_rows (
  actor_id UUID NOT NULL REFERENCES public.profiles(id),
  import_id UUID NOT NULL,
  row_id TEXT NOT NULL,
  company_id INTEGER NOT NULL REFERENCES public.company(id),
  category TEXT NOT NULL,
  order_code TEXT NOT NULL,
  product_id INTEGER NOT NULL REFERENCES public.product(id),
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (actor_id,import_id,row_id)
);
ALTER TABLE public.catalogue_import_rows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.catalogue_import_rows FROM anon,authenticated;
GRANT ALL ON public.catalogue_import_rows TO service_role;
CREATE INDEX product_catalogue_import_lookup ON public.product
  (company_id,airtable_colum_name,lower(btrim(details->>'orderCode')))
  WHERE project_id IS NULL AND report_id IS NULL AND estimate_su_id IS NULL;

CREATE FUNCTION public.fn_commit_catalogue_import_row(
  p_actor_id UUID,p_import_id UUID,p_row_id TEXT,p_company_id INTEGER,p_category TEXT,
  p_order_code TEXT,p_details JSONB,p_decision TEXT,
  p_existing_product_id INTEGER DEFAULT NULL,p_existing_updated_at TIMESTAMPTZ DEFAULT NULL
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_existing public.product;
  v_prior public.catalogue_import_rows;
  v_id INTEGER;
  v_result JSONB;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Only the import backend may commit catalogue rows'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=p_actor_id AND type='SUPERADMIN' AND enabled AND NOT is_deleted)
    THEN RAISE EXCEPTION 'An active super admin is required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.company WHERE id=p_company_id AND type='SU' AND NOT coalesce(is_deleted,false))
    THEN RAISE EXCEPTION 'Supplier company is not available'; END IF;
  IF p_category NOT IN ('fixtures','lamp','power-supply','control','accessories') OR p_category IS NULL
    OR nullif(btrim(p_order_code),'') IS NULL OR length(p_order_code)>255
    OR nullif(btrim(p_row_id),'') IS NULL OR length(p_row_id)>255
    OR p_decision NOT IN ('create','update') OR p_decision IS NULL
    THEN RAISE EXCEPTION 'Invalid catalogue import row'; END IF;
  IF jsonb_typeof(p_details) IS DISTINCT FROM 'object' OR nullif(p_details->>'productImage','') IS NULL
    OR jsonb_typeof(p_details->'importedAssets') IS DISTINCT FROM 'object'
    OR p_details #>> '{importedAssets,productImage,url}' IS DISTINCT FROM p_details->>'productImage'
    THEN RAISE EXCEPTION 'A saved product image is required'; END IF;

  -- Serialize both replay handling and the supplier/category/order-code duplicate decision.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_actor_id::text||':'||p_import_id::text||':'||p_row_id,0));
  SELECT * INTO v_prior FROM public.catalogue_import_rows WHERE actor_id=p_actor_id AND import_id=p_import_id AND row_id=p_row_id;
  IF FOUND THEN
    IF v_prior.company_id<>p_company_id OR v_prior.category<>p_category OR v_prior.order_code<>p_order_code
      THEN RAISE EXCEPTION 'Import row identity changed; restart preview'; END IF;
    RETURN v_prior.result || jsonb_build_object('replayed',true);
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_company_id::text||':'||p_category||':'||lower(btrim(p_order_code)),0));
  IF p_decision='create' THEN
    IF EXISTS (SELECT 1 FROM public.product WHERE company_id=p_company_id AND airtable_colum_name=p_category
      AND lower(btrim(details->>'orderCode'))=lower(btrim(p_order_code))
      AND project_id IS NULL AND report_id IS NULL AND estimate_su_id IS NULL)
      THEN RAISE EXCEPTION 'Duplicate detected; refresh preview and choose a duplicate action'; END IF;
    INSERT INTO public.product (user_id,company_id,airtable_record,airtable_colum_name,details,created_at,updated_at)
      VALUES (p_actor_id,p_company_id,p_order_code,p_category,p_details||jsonb_build_object('orderCode',p_order_code),now(),now()) RETURNING id INTO v_id;
  ELSE
    SELECT * INTO v_existing FROM public.product WHERE id=p_existing_product_id FOR UPDATE;
    IF NOT FOUND OR v_existing.company_id IS DISTINCT FROM p_company_id OR v_existing.airtable_colum_name<>p_category
      OR lower(btrim(v_existing.details->>'orderCode')) IS DISTINCT FROM lower(btrim(p_order_code))
      OR v_existing.project_id IS NOT NULL OR v_existing.report_id IS NOT NULL OR v_existing.estimate_su_id IS NOT NULL
      THEN RAISE EXCEPTION 'Duplicate target changed; refresh preview'; END IF;
    IF v_existing.updated_at IS DISTINCT FROM p_existing_updated_at THEN RAISE EXCEPTION 'Product changed since preview; refresh preview'; END IF;
    UPDATE public.product SET details=v_existing.details||p_details||jsonb_build_object('orderCode',p_order_code),updated_at=now() WHERE id=v_existing.id;
    v_id=v_existing.id;
  END IF;
  v_result=jsonb_build_object('status',CASE WHEN p_decision='create' THEN 'created' ELSE 'updated' END,'productId',v_id,
    'assetPaths',(SELECT jsonb_agg(value->>'path') FROM jsonb_each(p_details->'importedAssets')));
  INSERT INTO public.catalogue_import_rows (actor_id,import_id,row_id,company_id,category,order_code,product_id,result)
    VALUES (p_actor_id,p_import_id,p_row_id,p_company_id,p_category,p_order_code,v_id,v_result);
  RETURN v_result;
END;
$$;
REVOKE ALL ON FUNCTION public.fn_commit_catalogue_import_row(UUID,UUID,TEXT,INTEGER,TEXT,TEXT,JSONB,TEXT,INTEGER,TIMESTAMPTZ) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.fn_commit_catalogue_import_row(UUID,UUID,TEXT,INTEGER,TEXT,TEXT,JSONB,TEXT,INTEGER,TIMESTAMPTZ) TO service_role;
