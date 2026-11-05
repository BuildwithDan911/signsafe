export type SourceType = "pdf" | "docx" | "text" | "paste" | "link" | "photo";

export interface HiddenTextItem {
  text: string;
  reason: string;
}

export interface FileSignalItem {
  id: string; // e.g. FM1, FM2, FM3, SI1
  note: string;
}

export interface ScriptItem {
  origin: "macro" | "macro-strings" | "command" | "page-script";
  code: string;
}

export interface DocMetadata {
  author?: string;
  company?: string;
  producer?: string;
  creator?: string;
  created?: string;
  modified?: string;
  lastModifiedBy?: string;
}

export interface EmailItem {
  email: string;
  isFreeWebmail: boolean;
  domain: string;
}

export interface SignDoc {
  id: string;
  sourceType: SourceType;
  fileName: string;
  text: string;
  hiddenText: HiddenTextItem[];
  fileSignals: FileSignalItem[];
  scripts: ScriptItem[];
  metadata: DocMetadata;
  emails: EmailItem[];
  pdfBase64?: string;
  pdfPageCount?: number;
}
