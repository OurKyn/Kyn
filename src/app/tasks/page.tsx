'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useFamilyContext } from '@/context/family-context'
import { createClient } from '@/utils/supabase/client'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { LoadingState } from '@/components/loading-state'
import { EmptyState } from '@/components/empty-state'

const taskSchema = z.object({
  title: z.string().min(2, 'Task title required'),
  description: z.string().optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
})

type TaskForm = z.infer<typeof taskSchema>

interface Task {
  id: string
  family_id: string
  assigned_to: string | null
  title: string
  description: string | null
  completed: boolean
  due_date: string | null
  created_at: string
}

export default function TasksPage() {
  const { selectedFamilyId } = useFamilyContext()
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)

  // Fetch tasks for the selected family
  const { data: tasks, isLoading } = useQuery({
    queryKey: ['tasks', selectedFamilyId],
    queryFn: async () => {
      if (!selectedFamilyId) return []
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('family_id', selectedFamilyId)
        .order('created_at', { ascending: false })
      if (error) throw new Error('Failed to fetch tasks')
      return data
    },
    enabled: !!selectedFamilyId,
  })

  // Create task form
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<TaskForm>({
    resolver: zodResolver(taskSchema),
    defaultValues: { title: '', description: '', assignedTo: '', dueDate: '' },
  })

  const createTask = useMutation({
    mutationFn: async (values: TaskForm) => {
      setError(null)
      if (!selectedFamilyId) {
        setError('No family selected')
        return
      }
      const { error: insertError } = await supabase.from('tasks').insert({
        family_id: selectedFamilyId,
        title: values.title,
        description: values.description,
        assigned_to: values.assignedTo || null,
        due_date: values.dueDate || null,
      })
      if (insertError) {
        setError('Failed to create task')
        throw insertError
      }
    },
    onSuccess: () => {
      reset()
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedFamilyId] })
    },
  })

  const handleComplete = useMutation({
    mutationFn: async (taskId: string) => {
      const { error: updateError } = await supabase
        .from('tasks')
        .update({ completed: true })
        .eq('id', taskId)
      if (updateError) throw updateError
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks', selectedFamilyId] })
    },
  })

  return (
    <div className="max-w-2xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Family Tasks</h1>
      <form
        onSubmit={handleSubmit((values) => createTask.mutate(values))}
        className="mb-6 space-y-2"
      >
        <input
          {...register('title')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Task title"
          disabled={isSubmitting}
        />
        {errors.title && (
          <p className="text-red-500 text-xs mt-1">{errors.title.message}</p>
        )}
        <textarea
          {...register('description')}
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Description (optional)"
          disabled={isSubmitting}
        />
        <input
          {...register('dueDate')}
          type="date"
          className="w-full border rounded px-3 py-2 focus:outline-none focus:ring focus:border-blue-300"
          placeholder="Due date (optional)"
          disabled={isSubmitting}
        />
        {/* Assignment dropdown can be added here if you want to assign to a member */}
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          disabled={isSubmitting}
        >
          Create Task
        </button>
        {error && <div className="text-red-500 text-sm mt-2">{error}</div>}
      </form>
      {isLoading ? (
        <LoadingState message="Loading tasks..." />
      ) : !tasks || tasks.length === 0 ? (
        <EmptyState message="No tasks yet. Create your first task!" />
      ) : (
        <ul className="space-y-4">
          {tasks.map((task: Task) => (
            <li
              key={task.id}
              className="border rounded p-4 flex flex-col gap-2 bg-white dark:bg-brand-dark/80"
            >
              <div className="flex items-center justify-between">
                <span
                  className={`font-semibold ${task.completed ? 'line-through text-gray-400' : ''}`}
                >
                  {task.title}
                </span>
                {!task.completed && (
                  <button
                    onClick={() => handleComplete.mutate(task.id)}
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-xs"
                  >
                    Mark Complete
                  </button>
                )}
              </div>
              {task.description && (
                <div className="text-sm text-gray-600">{task.description}</div>
              )}
              {task.due_date && (
                <div className="text-xs text-gray-500">
                  Due: {task.due_date}
                </div>
              )}
              {task.completed && (
                <div className="text-xs text-green-600">Completed</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
