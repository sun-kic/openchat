import { redirect } from 'next/navigation'
import { getCurrentProfile } from '@/lib/actions/auth'
import { getCourseById } from '@/lib/actions/courses'
import { getQuestionsByCourse } from '@/lib/actions/questions'
import CreateActivityWizard from '@/components/teacher/CreateActivityWizard'

export default async function NewActivityPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const profile = await getCurrentProfile()

  if (!profile) {
    redirect('/login')
  }

  if (profile.role !== 'teacher' && profile.role !== 'ta') {
    redirect('/')
  }

  const { data: course, error: courseError } = await getCourseById(id)
  const { data: questions, error: questionsError } = await getQuestionsByCourse(id)

  if (courseError || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Course Not Found
          </h1>
          <p className="text-gray-600">{courseError || 'Course does not exist'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <CreateActivityWizard course={course} questions={questions || []} />
    </div>
  )
}
