import React from 'react';
import { Control, FieldValues, Path } from 'react-hook-form';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { useStates } from '@/hooks/use-geographic';

export interface AddressFormProps<T extends FieldValues> {
  control: Control<T>;
  prefix?: string;
  disabled?: boolean;
}

/**
 * Reusable address field group that renders address, address2, city, state,
 * zip_code, and country fields in a responsive grid.
 *
 * `prefix` allows nesting (e.g. prefix="shipping_" produces field names
 * like "shipping_address", "shipping_city", etc.).
 */
export function AddressForm<T extends FieldValues>({
  control,
  prefix = '',
  disabled = false,
}: AddressFormProps<T>) {
  const { data: states, isLoading: statesLoading } = useStates();

  const fieldName = (name: string) => `${prefix}${name}` as Path<T>;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      {/* Address line 1 – full width */}
      <div className="sm:col-span-2">
        <FormField
          control={control}
          name={fieldName('address')}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address</FormLabel>
              <FormControl>
                <Input placeholder="Street address" disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Address line 2 – full width */}
      <div className="sm:col-span-2">
        <FormField
          control={control}
          name={fieldName('address2')}
          render={({ field }) => (
            <FormItem>
              <FormLabel>Address 2</FormLabel>
              <FormControl>
                <Input placeholder="Apt, suite, unit, etc." disabled={disabled} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* City */}
      <FormField
        control={control}
        name={fieldName('city')}
        render={({ field }) => (
          <FormItem>
            <FormLabel>City</FormLabel>
            <FormControl>
              <Input placeholder="City" disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* State */}
      <FormField
        control={control}
        name={fieldName('state')}
        render={({ field }) => (
          <FormItem>
            <FormLabel>State</FormLabel>
            <Select
              onValueChange={field.onChange}
              value={field.value ?? ''}
              disabled={disabled || statesLoading}
            >
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                {(states ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.abbreviation}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Zip code */}
      <FormField
        control={control}
        name={fieldName('zip_code')}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Zip Code</FormLabel>
            <FormControl>
              <Input placeholder="Zip code" disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Country */}
      <FormField
        control={control}
        name={fieldName('country')}
        render={({ field }) => (
          <FormItem>
            <FormLabel>Country</FormLabel>
            <FormControl>
              <Input placeholder="Country" disabled={disabled} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
