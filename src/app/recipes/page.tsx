'use client'

import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useFamilyContext } from '@/context/family-context'
import { createClient } from '@/utils/supabase/client'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useFieldArray } from 'react-hook-form'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'
import Image from 'next/image'

const recipeSchema = z.object({
  title: z.string().min(2, 'Title required'),
  description: z.string().optional(),
  ingredients: z.array(z.string().min(1, 'Ingredient required')).min(1),
  steps: z.array(z.string().min(1, 'Step required')).min(1),
  imageUrl: z
    .string()
    .url('Must be a valid image URL')
    .optional()
    .or(z.literal('')),
})

type RecipeForm = z.infer<typeof recipeSchema>

interface Recipe {
  id: string
  family_id: string
  author_id: string | null
  title: string
  description: string | null
  ingredients: string[]
  steps: string[]
  image_url: string | null
  created_at: string
  updated_at: string
}

export default function RecipesPage() {
  const { selectedFamilyId } = useFamilyContext()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  // Fetch recipes for the selected family
  const { data: recipes, isLoading } = useQuery({
    queryKey: ['recipes', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) return []
      const { data, error } = await supabase
        .from('recipes')
        .select('*')
        .eq('family_id', selectedFamilyId)
        .order('created_at', { ascending: false })
      if (error) throw new Error('Failed to fetch recipes')
      return data
    },
    enabled: !!selectedFamilyId,
  })

  // Create recipe form
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isSubmitting },
  } = useForm<RecipeForm>({
    resolver: zodResolver(recipeSchema),
    defaultValues: {
      title: '',
      description: '',
      ingredients: [''],
      steps: [''],
      imageUrl: '',
    },
  })
  const ingredientsField = useFieldArray({ control, name: 'ingredients' })
  const stepsField = useFieldArray({ control, name: 'steps' })

  const onCreate = async (values: RecipeForm) => {
    setError(null)
    if (!selectedFamilyId) {
      setError('No family selected')
      return
    }
    // Get current user profile for author_id
    const { data: userData, error: userError } = await supabase.auth.getUser()
    if (userError || !userData?.user) {
      setError('Not authenticated')
      return
    }
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userData.user.id)
      .single()
    if (profileError || !profile) {
      setError('Profile not found')
      return
    }
    const { error: insertError } = await supabase.from('recipes').insert({
      family_id: selectedFamilyId,
      author_id: profile.id,
      title: values.title,
      description: values.description,
      ingredients: values.ingredients,
      steps: values.steps,
      image_url: values.imageUrl || null,
    })
    if (insertError) {
      setError('Failed to create recipe')
      return
    }
    reset()
    queryClient.invalidateQueries({ queryKey: ['recipes', selectedFamilyId] })
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Recipe Sharing</h1>
      <form onSubmit={handleSubmit(onCreate)} className="mb-6 space-y-2">
        <input
          {...register('title')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Recipe title"
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
        )}
        <input
          {...register('description')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Description (optional)"
          disabled={isSubmitting}
        />
        <div>
          <label
            htmlFor="ingredient-0"
            className="block text-sm font-medium mb-1"
          >
            Ingredients
          </label>
          {ingredientsField.fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2 mb-1">
              <input
                id={`ingredient-${idx}`}
                {...register(`ingredients.${idx}` as const)}
                className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring focus:border-blue-300"
                placeholder={`Ingredient ${idx + 1}`}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="text-red-500 px-2"
                onClick={() => ingredientsField.remove(idx)}
                disabled={isSubmitting || ingredientsField.fields.length === 1}
                aria-label="Remove ingredient"
              >
                &times;
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-blue-600 text-xs mt-1"
            onClick={() => ingredientsField.append('')}
            disabled={isSubmitting}
          >
            + Add Ingredient
          </button>
          {errors.ingredients && (
            <p className="text-red-500 text-xs mt-1">
              {errors.ingredients.message as string}
            </p>
          )}
        </div>
        <div>
          <label htmlFor="step-0" className="block text-sm font-medium mb-1">
            Steps
          </label>
          {stepsField.fields.map((field, idx) => (
            <div key={field.id} className="flex gap-2 mb-1">
              <input
                id={`step-${idx}`}
                {...register(`steps.${idx}` as const)}
                className="flex-1 border rounded px-2 py-1 text-sm focus:outline-none focus:ring focus:border-blue-300"
                placeholder={`Step ${idx + 1}`}
                disabled={isSubmitting}
              />
              <button
                type="button"
                className="text-red-500 px-2"
                onClick={() => stepsField.remove(idx)}
                disabled={isSubmitting || stepsField.fields.length === 1}
                aria-label="Remove step"
              >
                &times;
              </button>
            </div>
          ))}
          <button
            type="button"
            className="text-blue-600 text-xs mt-1"
            onClick={() => stepsField.append('')}
            disabled={isSubmitting}
          >
            + Add Step
          </button>
          {errors.steps && (
            <p className="text-red-500 text-xs mt-1">
              {errors.steps.message as string}
            </p>
          )}
        </div>
        <input
          {...register('imageUrl')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Image URL (optional)"
          disabled={isSubmitting}
        />
        {errors.imageUrl && (
          <p className="text-red-500 text-xs mt-1">{errors.imageUrl.message}</p>
        )}
        <button
          type="submit"
          className="bg-lime-600 text-white px-4 py-2 rounded hover:bg-lime-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          Share Recipe
        </button>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </form>
      {isLoading ? (
        <LoadingState message="Loading recipes..." />
      ) : !recipes || recipes.length === 0 ? (
        <EmptyState message="No recipes yet. Share your first family recipe!" />
      ) : (
        <div className="space-y-6">
          {(recipes || []).map((recipe: Recipe) => (
            <div
              key={recipe.id}
              className="border rounded p-4 bg-white dark:bg-brand-dark/80"
            >
              <div className="font-semibold text-lg mb-1 flex items-center gap-2">
                {recipe.image_url && (
                  <Image
                    src={recipe.image_url}
                    alt={recipe.title}
                    width={48}
                    height={48}
                    className="w-12 h-12 object-cover rounded"
                  />
                )}
                {recipe.title}
              </div>
              <div className="text-xs text-gray-500 mb-2">
                {new Date(recipe.created_at).toLocaleString()}
              </div>
              {recipe.description && (
                <div className="mb-2">{recipe.description}</div>
              )}
              <div className="mb-2">
                <strong>Ingredients:</strong>
                <ul className="list-disc ml-6">
                  {recipe.ingredients.map((ing, i) => (
                    <li key={i}>{ing}</li>
                  ))}
                </ul>
              </div>
              <div className="mb-2">
                <strong>Steps:</strong>
                <ol className="list-decimal ml-6">
                  {recipe.steps.map((step, i) => (
                    <li key={i}>{step}</li>
                  ))}
                </ol>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
