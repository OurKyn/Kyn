import { useForm, FieldValues, SubmitHandler } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ZodSchema, ZodTypeAny } from 'zod'
import { motion } from 'framer-motion'

interface AuthFormProps<T extends FieldValues> {
  schema: ZodSchema<T>
  onSubmit: SubmitHandler<T>
  buttonText: string
}

export function AuthForm<T extends FieldValues>({
  schema,
  onSubmit,
  buttonText,
}: AuthFormProps<T>) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<T>({
    resolver: zodResolver(schema),
  })

  // @ts-expect-error: shape is not always present on all Zod schemas
  const fields = Object.keys((schema as ZodTypeAny).shape || {})

  return (
    <motion.form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-6"
      aria-label="Auth form"
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7 }}
    >
      {fields.map((field) => (
        <div key={field}>
          <label htmlFor={field} className="block text-sm font-medium">
            {field.charAt(0).toUpperCase() + field.slice(1)}
          </label>
          <input
            id={field}
            type={field === 'password' ? 'password' : 'text'}
            {...register(field)}
            className="mt-1 block w-full rounded border border-brand/20 dark:border-brand-accent/30 bg-white/70 dark:bg-brand-dark/60 shadow-sm focus:border-brand-accent focus:ring-brand-accent transition-colors"
            aria-invalid={!!errors[field]}
            aria-describedby={errors[field] ? `${field}-error` : undefined}
          />
          {errors[field] && (
            <p id={`${field}-error`} className="mt-1 text-xs text-red-600">
              {String(errors[field]?.message)}
            </p>
          )}
        </div>
      ))}
      <motion.button
        type="submit"
        className="w-full py-2 px-4 rounded-lg bg-brand-accent text-brand-dark font-bold shadow-md hover:scale-105 active:scale-95 transition-transform duration-200 focus:outline-none focus:ring-2 focus:ring-brand-accent focus:ring-offset-2"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        {buttonText}
      </motion.button>
    </motion.form>
  )
}
