import { MessageMeta } from '@/types'

/**
 * Validate message content for discussion submissions
 * Used for both client-side preview and server-side validation
 */
export function validateMessageContent(
  content: string,
  minLength: number = 20,
  conceptTags: string[] = []
): { valid: boolean; error?: string; meta: MessageMeta } {
  const len = content.trim().length

  if (len < minLength) {
    return {
      valid: false,
      error: `Message must be at least ${minLength} characters (currently ${len})`,
      meta: { len },
    }
  }

  // Check for keywords from concept tags
  const keywordHits = conceptTags.filter((tag) =>
    content.toLowerCase().includes(tag.toLowerCase())
  )

  // Check for causality patterns
  const causalityPatterns = [
    /if\s+.+\s+then/i,
    /because/i,
    /therefore/i,
    /thus/i,
    /hence/i,
    /so\s+/i,
    /as a result/i,
  ]
  const hasCausality = causalityPatterns.some((pattern) => pattern.test(content))

  // Check for example patterns
  const examplePatterns = [
    /for example/i,
    /such as/i,
    /e\.g\./i,
    /like\s+/i,
    /for instance/i,
    /example:/i,
    /case:/i,
  ]
  const hasExample = examplePatterns.some((pattern) => pattern.test(content))

  // Check for boundary/edge case patterns
  const boundaryPatterns = [
    /edge case/i,
    /boundary/i,
    /empty/i,
    /null/i,
    /undefined/i,
    /zero/i,
    /negative/i,
  ]
  const hasBoundary = boundaryPatterns.some((pattern) => pattern.test(content))

  const meta: MessageMeta = {
    len,
    keyword_hits: keywordHits,
    has_causality: hasCausality,
    has_example: hasExample,
    has_boundary: hasBoundary,
    has_if_then: /if\s+.+\s+then/i.test(content),
  }

  return { valid: true, meta }
}
