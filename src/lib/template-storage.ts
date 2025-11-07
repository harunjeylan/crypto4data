import { CertificateTemplate } from '@/types/template';

const TEMPLATE_STORAGE_KEY = 'certificate_templates';
const CURRENT_TEMPLATE_KEY = 'current_template';

export const saveTemplate = (template: CertificateTemplate): void => {
  const templates = getTemplates();
  const existingIndex = templates.findIndex(t => t.id === template.id);
  
  if (existingIndex >= 0) {
    templates[existingIndex] = template;
  } else {
    templates.push(template);
  }
  
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates));
  localStorage.setItem(CURRENT_TEMPLATE_KEY, template.id);
};

export const getTemplates = (): CertificateTemplate[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(TEMPLATE_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
};

export const getTemplate = (id: string): CertificateTemplate | null => {
  const templates = getTemplates();
  return templates.find(t => t.id === id) || null;
};

export const getCurrentTemplate = (): CertificateTemplate | null => {
  if (typeof window === 'undefined') return null;
  const currentId = localStorage.getItem(CURRENT_TEMPLATE_KEY);
  if (!currentId) return null;
  return getTemplate(currentId);
};

export const deleteTemplate = (id: string): void => {
  const templates = getTemplates();
  const filtered = templates.filter(t => t.id !== id);
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(filtered));
  
  const currentId = localStorage.getItem(CURRENT_TEMPLATE_KEY);
  if (currentId === id) {
    localStorage.removeItem(CURRENT_TEMPLATE_KEY);
  }
};

