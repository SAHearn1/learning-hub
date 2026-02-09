'use client';

import { useMemo } from 'react';
import { ExternalLink, FileText, Star } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { SourceCitation } from '@/types/chat';

interface SourceCitationPanelProps {
  citations: SourceCitation[];
  className?: string;
}

/**
 * Display source citations from curriculum content
 * Shows document name, relevance score, and expandable text content
 */
export function SourceCitationPanel({ citations, className }: SourceCitationPanelProps) {
  // Sort citations by relevance score (highest first)
  const sortedCitations = useMemo(() => {
    return [...citations].sort((a, b) => b.relevanceScore - a.relevanceScore);
  }, [citations]);

  // Group citations by document for cleaner display
  const citationsByDocument = useMemo(() => {
    const groups = new Map<string, SourceCitation[]>();
    
    sortedCitations.forEach(citation => {
      const existing = groups.get(citation.filename) || [];
      existing.push(citation);
      groups.set(citation.filename, existing);
    });
    
    return Array.from(groups.entries());
  }, [sortedCitations]);

  if (citations.length === 0) {
    return null;
  }

  /**
   * Format filename for display
   * Converts "02-introduction/overview.md" to "Introduction: Overview"
   */
  const formatFilename = (filename: string): string => {
    // Remove numbers and dashes at start
    const cleaned = filename.replace(/^\d+-/, '').replace(/\.md$/, '');
    const parts = cleaned.split('/');
    return parts.map(part => 
      part.split('-').map(word => 
        word.charAt(0).toUpperCase() + word.slice(1)
      ).join(' ')
    ).join(': ');
  };

  /**
   * Convert relevance score (0-1) to percentage
   */
  const scoreToPercentage = (score: number): number => {
    return Math.round(score * 100);
  };

  /**
   * Get badge variant based on relevance score
   */
  const getBadgeVariant = (score: number): 'default' | 'secondary' | 'outline' => {
    const percentage = scoreToPercentage(score);
    if (percentage >= 80) return 'default';
    if (percentage >= 60) return 'secondary';
    return 'outline';
  };

  return (
    <div className={cn('rounded-lg border bg-neutral-50 p-3', className)}>
      <div className="mb-2 flex items-center gap-2">
        <FileText className="h-4 w-4 text-neutral-600" />
        <span className="text-xs font-semibold text-neutral-700">
          {citations.length} {citations.length === 1 ? 'Source' : 'Sources'} Used
        </span>
      </div>

      <Accordion type="single" collapsible className="w-full">
        {citationsByDocument.map(([filename, docCitations], docIndex) => (
          <AccordionItem key={filename} value={`doc-${docIndex}`}>
            <AccordionTrigger className="text-sm hover:no-underline">
              <div className="flex items-center gap-2 text-left">
                <span className="font-medium text-neutral-900">
                  {formatFilename(filename)}
                </span>
                {docCitations.length > 1 && (
                  <Badge variant="outline" className="text-xs">
                    {docCitations.length} sections
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent>
              <div className="space-y-3">
                {docCitations.map((citation) => (
                  <div
                    key={citation.id}
                    className="rounded border border-neutral-200 bg-white p-3"
                  >
                    {/* Citation header */}
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="flex-1">
                        {citation.section && (
                          <div className="mb-1 text-xs font-medium text-neutral-700">
                            {citation.section}
                          </div>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-600">
                          <span>
                            Chunk {citation.chunkIndex + 1} of {citation.totalChunks}
                          </span>
                          {citation.gradeLevel > 0 && (
                            <Badge variant="outline" className="text-xs">
                              Grade {citation.gradeLevel}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant={getBadgeVariant(citation.relevanceScore)}>
                        <Star className="mr-1 h-3 w-3" />
                        {scoreToPercentage(citation.relevanceScore)}%
                      </Badge>
                    </div>

                    {/* Citation text */}
                    <div className="mb-2 max-h-48 overflow-y-auto rounded bg-neutral-50 p-2 text-xs text-neutral-700">
                      <p className="whitespace-pre-wrap">{citation.text}</p>
                    </div>

                    {/* View source link */}
                    <a
                      href={citation.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View full document
                    </a>
                  </div>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
