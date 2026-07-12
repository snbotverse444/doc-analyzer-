export type SupportedFileType = 'xlsx' | 'xls' | 'docx' | 'pptx' | 'txt';

export interface DiagramNote {
  location: string; // e.g. "Slide 4" or "Section: Deployment Architecture"
  description: string; // LLM-generated description of the diagram/image
}

export interface SectionContext {
  id: string;
  title: string; // sheet name / heading / slide title
  summary: string; // LLM-generated structured summary
  rawExcerpt?: string; // small excerpt kept for grounding, trimmed
}

export interface DocumentContext {
  fileName: string;
  fileType: SupportedFileType;
  generatedAt: string;
  sections: SectionContext[];
  diagrams: DiagramNote[];
  overallSummary: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
}

export type PipelineStage =
  | 'idle'
  | 'uploading'
  | 'parsing'
  | 'structuring'
  | 'ready'
  | 'error';
