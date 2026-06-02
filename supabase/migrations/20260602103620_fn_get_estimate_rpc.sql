-- Optimized fn_get_estimate: collects all referenced profile UUIDs in one CTE,
-- joins profiles+company once, builds user JSONB in the CTE itself, then
-- references results by profile_id — no helper function, no anyelement issues.

-- Drop the broken anyelement helper if it was created by a prior migration.
DROP FUNCTION IF EXISTS public.fn_build_estimate_user_from_row(anyelement);

CREATE OR REPLACE FUNCTION public.fn_get_estimate(
  p_estimate_id INTEGER,
  p_table_type  TEXT DEFAULT 'estimate'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN

  IF p_table_type = 'estimate' THEN

    WITH user_ids AS (
      SELECT
        e.user_reu_id,
        e.user_su_id,
        e.user_admin_consultant_id,
        e.fulfilled_by_user_estimate_su_id,
        e.fulfilled_by_user_order_su_id,
        e.fulfilled_by_user_shipping_su_id,
        e.fulfilled_by_user_invoice_su_id,
        e.fulfilled_by_user_receipt_su_id,
        e.archived_by_user_estimate_su_id
      FROM estimate e WHERE e.id = p_estimate_id
    ),
    all_user_jsons AS (
      SELECT
        pr.id AS profile_id,
        jsonb_build_object(
          'id',        pr.legacy_id,
          'email',     pr.email,
          'username',  pr.username,
          'firstName', pr.first_name,
          'lastName',  pr.last_name,
          'type',      pr.type,
          'title',     pr.title,
          'avatar',    pr.avatar,
          'phone',     pr.phone,
          'enabled',   pr.enabled,
          'isDeleted', pr.is_deleted,
          'recordId',  pr.record_id,
          'associatedToCompany', CASE WHEN c.id IS NULL THEN NULL ELSE
            jsonb_build_object(
              'id',             c.id,
              'name',           c.name,
              'notes',          c.notes,
              'address',        c.address,
              'address2',       c.address2,
              'image',          c.image,
              'state',          c.state,
              'status',         c.status,
              'type',           c.type,
              'website',        c.website,
              'zipCode',        c.zip_code,
              'country',        c.country,
              'city',           c.city,
              'isDeleted',      c.is_deleted,
              'recordId',       c.record_id,
              'companySubType', c.company_sub_type
            )
          END
        ) AS user_json
      FROM profiles pr
      LEFT JOIN company c ON c.id = pr.associated_to_company_id
      WHERE pr.id IN (
        SELECT user_reu_id                        FROM user_ids
        UNION SELECT user_su_id                   FROM user_ids
        UNION SELECT user_admin_consultant_id      FROM user_ids
        UNION SELECT fulfilled_by_user_estimate_su_id FROM user_ids
        UNION SELECT fulfilled_by_user_order_su_id    FROM user_ids
        UNION SELECT fulfilled_by_user_shipping_su_id FROM user_ids
        UNION SELECT fulfilled_by_user_invoice_su_id  FROM user_ids
        UNION SELECT fulfilled_by_user_receipt_su_id  FROM user_ids
        UNION SELECT archived_by_user_estimate_su_id  FROM user_ids
      )
    )
    SELECT (
      jsonb_build_object(
        'id',                          e.id,
        'orderUid',                    e.order_uid,
        'reference',                   e.reference,
        'createdAt',                   e.created_at,
        'orderDateCreated',            e.order_date_created,
        'orderDateUpdated',            e.order_date_updated,
        'updatedAt',                   e.updated_at,
        'suSignature',                 e.su_signature,
        'adminSignature',              e.admin_signature,
        'salesTax',                    e.sales_tax,
        'rebates',                     e.rebates,
        'shipping',                    e.shipping,
        'suApproved',                  COALESCE(e.su_approved, false),
        'suSignatureDate',             e.su_signature_date,
        'adminSignatureDate',          e.admin_signature_date,
        'suNotes',                     e.su_notes,
        'depositAmount',               e.deposit_amount,
        'depositDue',                  e.deposit_due,
        'remainderDue',                e.remainder_due,
        'remainderAmount',             e.remainder_amount,
        'isOrder',                     COALESCE(e.is_order, false),
        'isEstimate',                  COALESCE(e.is_estimate, false),
        'isShipping',                  COALESCE(e.is_shipping, false),
        'shippingStatus',              e.shipping_status,
        'luminaires',                  COALESCE(e.luminaires, '[]'::jsonb),
        'shippingDateCreated',         e.shipping_date_created,
        'shippingDateUpdated',         e.shipping_date_updated,
        'isInvoice',                   COALESCE(e.is_invoice, false),
        'invoiceDateCreated',          e.invoice_date_created,
        'invoiceDateUpdated',          e.invoice_date_updated,
        'isReceipt',                   COALESCE(e.is_receipt, false),
        'receiptDateCreated',          e.receipt_date_created,
        'receiptDateUpdated',          e.receipt_date_updated,
        'markedFulfilled',             COALESCE(e.marked_fulfilled, false),
        'archived',                    COALESCE(e.archived, false),
        'archivedDateCreated',         e.archived_date_created,
        'archivedDateUpdated',         e.archived_date_updated,
        'markedFulfilledDateCreated',  e.marked_fulfilled_date_created,
        'markedFulfilledDateUpdated',  e.marked_fulfilled_date_updated
      ) || jsonb_build_object(
        'report', (
          SELECT jsonb_build_object(
            'id',                   r.id,
            'status',               r.status,
            'notes',                r.notes,
            'sortId',               r.sort_id,
            'proposal',             COALESCE(r.proposal, '[]'::jsonb),
            'illumination',         '[]'::jsonb,
            'proposalName',         r.proposal_name,
            'systemPrice',          r.system_price,
            'ledPrice',             r.led_price,
            'costYear',             r.cost_year,
            'addedCRI',             r.added_cri,
            'addedLumens',          r.added_lumens,
            'payback',              r.payback,
            'bidding',              r.bidding,
            'ETAdays',              r.etadays,
            'installation',         r.installation,
            'customPricing',        r.custom_pricing,
            'availability',         r.availability,
            'lightCountWaiver',     r.light_count_waiver,
            'rebates',              r.rebates,
            'shipping',             r.shipping,
            'colorTunable',         r.color_tunable,
            'lumenIncreaseSqFt',    r.lumen_increase_sq_ft,
            'lumenIncreaseFixture', r.lumen_increase_fixture,
            'tax',                  r.tax,
            'sensors',              r.sensors,
            'KWReduced',            r.kwreduced,
            'createdAt',            r.created_at,
            'approved',             r.approved,
            'active',               r.active,
            'project', (
              SELECT jsonb_build_object(
                'id',                   p.id,
                'title',                p.title,
                'address',              p.address,
                'address2',             p.address2,
                'city',                 p.city,
                'state',                p.state,
                'zipCode',              p.zip_code,
                'status',               p.status,
                'statusAdmin',          p.status_admin,
                'image',                p.image,
                'propertyType',         p.property_type,
                'propertySize',         p.property_size,
                'propertyPriorities',   COALESCE(p.property_priorities, '[]'::jsonb),
                'salesTax',             p.sales_tax,
                'costPerKilowattHour',  p.cost_per_kilowatt_hour,
                'operationDaysPerYear', p.operation_days_per_year,
                'beFinancing',          p.be_financing,
                'depositAmount',        p.deposit_amount,
                'interestRate',         p.interest_rate,
                'laborCost',            p.labor_cost,
                'lightCount',           p.light_count,
                'lightCountEstimate',   p.light_count_estimate,
                'loanPeriod',           p.loan_period,
                'notes',                p.notes,
                'areas',                COALESCE(p.areas, '[]'::jsonb),
                'files',                p.files,
                'proposals',            p.proposals,
                'bidding',              p.bidding,
                'requestLightCount',    p.request_light_count,
                'priorityAdmin',        p.priority_admin,
                'archived',             p.archived,
                'complienceHyperlink',  p.complience_hyperlink,
                'airtableId',           p.airtable_id,
                'createdAt',            p.created_at,
                'updatedAt',            p.updated_at
              )
              FROM project p WHERE p.id = r.project_id
            )
          )
          FROM report r WHERE r.id = e.report_id
        ),
        'userReu',                   (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.user_reu_id LIMIT 1),
        'userSu',                    (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.user_su_id LIMIT 1),
        'userAdminConsultant',       (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.user_admin_consultant_id LIMIT 1),
        'invoiceFiles', (
          SELECT COALESCE(jsonb_agg(to_jsonb(ui.*)), '[]'::jsonb)
          FROM uploads_invoice ui WHERE ui.estimate_su_id = e.id
        ),
        'receiptFiles', (
          SELECT COALESCE(jsonb_agg(to_jsonb(ur.*)), '[]'::jsonb)
          FROM uploads_receipt ur WHERE ur.estimate_su_id = e.id
        ),
        'shippingDetails', (
          SELECT COALESCE(jsonb_agg(to_jsonb(sd.*) ORDER BY sd.created_at DESC), '[]'::jsonb)
          FROM shipping_detail sd WHERE sd.estimate_su_id = e.id
        ),
        'fulfilledByUserEstimateSu', (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.fulfilled_by_user_estimate_su_id LIMIT 1),
        'fulfilledByUserOrderSu',    (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.fulfilled_by_user_order_su_id LIMIT 1),
        'fulfilledByUserShippingSu', (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.fulfilled_by_user_shipping_su_id LIMIT 1),
        'fulfilledByUserInvoiceSu',  (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.fulfilled_by_user_invoice_su_id LIMIT 1),
        'fulfilledByUserReceiptSu',  (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.fulfilled_by_user_receipt_su_id LIMIT 1),
        'archivedByUserEstimateSu',  (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.archived_by_user_estimate_su_id LIMIT 1)
      )
    ) INTO v_result
    FROM estimate e, user_ids
    WHERE e.id = p_estimate_id;

  ELSIF p_table_type = 'estimate_reu' THEN

    WITH user_ids AS (
      SELECT
        e.user_reu_id,
        e.user_admin_consultant_id,
        e.fulfilled_by_user_estimate_reu_id,
        e.fulfilled_by_user_order_reu_id,
        e.fulfilled_by_user_shipping_reu_id,
        e.fulfilled_by_user_invoice_reu_id,
        e.fulfilled_by_user_receipt_reu_id,
        e.archived_by_user_estimate_reu_id
      FROM estimate_reu e WHERE e.id = p_estimate_id
    ),
    all_user_jsons AS (
      SELECT
        pr.id AS profile_id,
        jsonb_build_object(
          'id',        pr.legacy_id,
          'email',     pr.email,
          'username',  pr.username,
          'firstName', pr.first_name,
          'lastName',  pr.last_name,
          'type',      pr.type,
          'title',     pr.title,
          'avatar',    pr.avatar,
          'phone',     pr.phone,
          'enabled',   pr.enabled,
          'isDeleted', pr.is_deleted,
          'recordId',  pr.record_id,
          'associatedToCompany', CASE WHEN c.id IS NULL THEN NULL ELSE
            jsonb_build_object(
              'id',             c.id,
              'name',           c.name,
              'notes',          c.notes,
              'address',        c.address,
              'address2',       c.address2,
              'image',          c.image,
              'state',          c.state,
              'status',         c.status,
              'type',           c.type,
              'website',        c.website,
              'zipCode',        c.zip_code,
              'country',        c.country,
              'city',           c.city,
              'isDeleted',      c.is_deleted,
              'recordId',       c.record_id,
              'companySubType', c.company_sub_type
            )
          END
        ) AS user_json
      FROM profiles pr
      LEFT JOIN company c ON c.id = pr.associated_to_company_id
      WHERE pr.id IN (
        SELECT user_reu_id                            FROM user_ids
        UNION SELECT user_admin_consultant_id         FROM user_ids
        UNION SELECT fulfilled_by_user_estimate_reu_id FROM user_ids
        UNION SELECT fulfilled_by_user_order_reu_id    FROM user_ids
        UNION SELECT fulfilled_by_user_shipping_reu_id FROM user_ids
        UNION SELECT fulfilled_by_user_invoice_reu_id  FROM user_ids
        UNION SELECT fulfilled_by_user_receipt_reu_id  FROM user_ids
        UNION SELECT archived_by_user_estimate_reu_id  FROM user_ids
      )
    )
    SELECT (
      jsonb_build_object(
        'id',                          e.id,
        'orderUid',                    e.order_uid,
        'reference',                   e.reference,
        'createdAt',                   e.created_at,
        'orderDateCreated',            e.order_date_created,
        'orderDateUpdated',            e.order_date_updated,
        'updatedAt',                   e.updated_at,
        'reuSignature',                e.reu_signature,
        'adminSignature',              e.admin_signature,
        'salesTax',                    e.sales_tax,
        'rebates',                     e.rebates,
        'shipping',                    e.shipping,
        'reuApproved',                 COALESCE(e.reu_approved, false),
        'reuSignatureDate',            e.reu_signature_date,
        'adminSignatureDate',          e.admin_signature_date,
        'reuNotes',                    e.reu_notes,
        'depositAmount',               e.deposit_amount,
        'depositDue',                  e.deposit_due,
        'remainderDue',                e.remainder_due,
        'remainderAmount',             e.remainder_amount,
        'isOrder',                     COALESCE(e.is_order, false),
        'isEstimate',                  COALESCE(e.is_estimate, false),
        'isShipping',                  COALESCE(e.is_shipping, false),
        'shippingStatus',              e.shipping_status,
        'luminaires',                  COALESCE(e.luminaires, '[]'::jsonb),
        'shippingDateCreated',         e.shipping_date_created,
        'shippingDateUpdated',         e.shipping_date_updated,
        'isInvoice',                   COALESCE(e.is_invoice, false),
        'invoiceDateCreated',          e.invoice_date_created,
        'invoiceDateUpdated',          e.invoice_date_updated,
        'isReceipt',                   COALESCE(e.is_receipt, false),
        'receiptDateCreated',          e.receipt_date_created,
        'receiptDateUpdated',          e.receipt_date_updated,
        'markedFulfilled',             COALESCE(e.marked_fulfilled, false),
        'archived',                    COALESCE(e.archived, false),
        'archivedDateCreated',         e.archived_date_created,
        'archivedDateUpdated',         e.archived_date_updated,
        'markedFulfilledDateCreated',  e.marked_fulfilled_date_created,
        'markedFulfilledDateUpdated',  e.marked_fulfilled_date_updated
      ) || jsonb_build_object(
        'report', (
          SELECT jsonb_build_object(
            'id',                   r.id,
            'status',               r.status,
            'notes',                r.notes,
            'sortId',               r.sort_id,
            'proposal',             COALESCE(r.proposal, '[]'::jsonb),
            'illumination',         '[]'::jsonb,
            'proposalName',         r.proposal_name,
            'systemPrice',          r.system_price,
            'ledPrice',             r.led_price,
            'costYear',             r.cost_year,
            'addedCRI',             r.added_cri,
            'addedLumens',          r.added_lumens,
            'payback',              r.payback,
            'bidding',              r.bidding,
            'ETAdays',              r.etadays,
            'installation',         r.installation,
            'customPricing',        r.custom_pricing,
            'availability',         r.availability,
            'lightCountWaiver',     r.light_count_waiver,
            'rebates',              r.rebates,
            'shipping',             r.shipping,
            'colorTunable',         r.color_tunable,
            'lumenIncreaseSqFt',    r.lumen_increase_sq_ft,
            'lumenIncreaseFixture', r.lumen_increase_fixture,
            'tax',                  r.tax,
            'sensors',              r.sensors,
            'KWReduced',            r.kwreduced,
            'createdAt',            r.created_at,
            'approved',             r.approved,
            'active',               r.active,
            'project', (
              SELECT jsonb_build_object(
                'id',                   p.id,
                'title',                p.title,
                'address',              p.address,
                'address2',             p.address2,
                'city',                 p.city,
                'state',                p.state,
                'zipCode',              p.zip_code,
                'status',               p.status,
                'statusAdmin',          p.status_admin,
                'image',                p.image,
                'propertyType',         p.property_type,
                'propertySize',         p.property_size,
                'propertyPriorities',   COALESCE(p.property_priorities, '[]'::jsonb),
                'salesTax',             p.sales_tax,
                'costPerKilowattHour',  p.cost_per_kilowatt_hour,
                'operationDaysPerYear', p.operation_days_per_year,
                'beFinancing',          p.be_financing,
                'depositAmount',        p.deposit_amount,
                'interestRate',         p.interest_rate,
                'laborCost',            p.labor_cost,
                'lightCount',           p.light_count,
                'lightCountEstimate',   p.light_count_estimate,
                'loanPeriod',           p.loan_period,
                'notes',                p.notes,
                'areas',                COALESCE(p.areas, '[]'::jsonb),
                'files',                p.files,
                'proposals',            p.proposals,
                'bidding',              p.bidding,
                'requestLightCount',    p.request_light_count,
                'priorityAdmin',        p.priority_admin,
                'archived',             p.archived,
                'complienceHyperlink',  p.complience_hyperlink,
                'airtableId',           p.airtable_id,
                'createdAt',            p.created_at,
                'updatedAt',            p.updated_at
              )
              FROM project p WHERE p.id = r.project_id
            )
          )
          FROM report r WHERE r.id = e.report_id
        ),
        'userReu',                    (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.user_reu_id LIMIT 1),
        'userAdminConsultant',        (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.user_admin_consultant_id LIMIT 1),
        'invoiceFiles', (
          SELECT COALESCE(jsonb_agg(to_jsonb(ui.*)), '[]'::jsonb)
          FROM uploads_invoice ui WHERE ui.estimate_reu_id = e.id
        ),
        'receiptFiles', (
          SELECT COALESCE(jsonb_agg(to_jsonb(ur.*)), '[]'::jsonb)
          FROM uploads_receipt ur WHERE ur.estimate_reu_id = e.id
        ),
        'shippingDetails', (
          SELECT COALESCE(jsonb_agg(to_jsonb(sd.*) ORDER BY sd.created_at DESC), '[]'::jsonb)
          FROM shipping_detail sd
          JOIN estimate est ON est.id = sd.estimate_su_id
          WHERE est.estimate_reu_id = e.id
        ),
        'fulfilledByUserEstimateReu', (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.fulfilled_by_user_estimate_reu_id LIMIT 1),
        'fulfilledByUserOrderReu',    (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.fulfilled_by_user_order_reu_id LIMIT 1),
        'fulfilledByUserShippingReu', (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.fulfilled_by_user_shipping_reu_id LIMIT 1),
        'fulfilledByUserInvoiceReu',  (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.fulfilled_by_user_invoice_reu_id LIMIT 1),
        'fulfilledByUserReceiptReu',  (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.fulfilled_by_user_receipt_reu_id LIMIT 1),
        'archivedByUserEstimateReu',  (SELECT uj.user_json FROM all_user_jsons uj WHERE uj.profile_id = e.archived_by_user_estimate_reu_id LIMIT 1)
      )
    ) INTO v_result
    FROM estimate_reu e, user_ids
    WHERE e.id = p_estimate_id;

  ELSE
    RAISE EXCEPTION 'Invalid table_type: %', p_table_type;
  END IF;

  RETURN v_result;
END;
$$;