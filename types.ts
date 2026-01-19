
export enum Language {
  EN = 'en',
  AR = 'ar'
}

export type PricingStep = 'materials' | 'labor' | 'margin' | 'summary';

export interface MaterialItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

export interface PricingState {
  materials: MaterialItem[];
  laborRate: number;
  laborHours: number;
  fixedLabor: number;
  profitMargin: number;
  taxRate: number;
}

export interface Project {
  id: string;
  name: string;
  date: string;
  state: PricingState;
}

export interface TranslationSet {
  title: string;
  materials: string;
  labor: string;
  profitTax: string;
  summary: string;
  addMaterial: string;
  materialName: string;
  qty: string;
  unitPrice: string;
  hourlyRate: string;
  hours: string;
  fixedCost: string;
  margin: string;
  tax: string;
  totalCost: string;
  sellingPrice: string;
  reset: string;
  next: string;
  prev: string;
  aiHelp: string;
  aiPlaceholder: string;
  aiLoading: string;
  exportPdf: string;
  exportExcel: string;
  saveProject: string;
  savedProjects: string;
  projectName: string;
  load: string;
  delete: string;
  save: string;
  noProjects: string;
  overwrite: string;
  quotes: string[];
  instructions: Record<PricingStep, string>;
  howToUse: string;
}
