'use client';

import { useState, useEffect } from 'react';
import { listTemplates, getTemplate } from '@pacct/specs';
import {
  renderSchemaSpecSummary,
  renderComputationSpecSummary,
  renderGovernanceSpecSummary,
  renderEconomicSpecSummary,
} from '@/lib/utils/spec-display';

interface TemplateInfo {
  category: string;
  description: string;
}

export default function TemplateBrowserPage() {
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    schema: string;
    computation: string;
    governance: string;
    economic: string;
  } | null>(null);
  const [cloned, setCloned] = useState<string | null>(null);

  useEffect(() => {
    setTemplates(listTemplates());
  }, []);

  const handlePreview = (category: string) => {
    if (selectedCategory === category) {
      setSelectedCategory(null);
      setPreview(null);
      return;
    }

    const template = getTemplate(category);
    if (!template) return;

    setSelectedCategory(category);
    setPreview({
      schema: renderSchemaSpecSummary(template.schema),
      computation: renderComputationSpecSummary(template.computation),
      governance: renderGovernanceSpecSummary(template.governance),
      economic: renderEconomicSpecSummary(template.economic),
    });
  };

  const handleClone = (category: string) => {
    const template = getTemplate(category);
    if (!template) return;

    // Placeholder clone — will use persistence adapter
    console.log('Cloning template as drafts:', {
      category,
      schema: template.schema,
      computation: template.computation,
      governance: template.governance,
      economic: template.economic,
    });
    setCloned(category);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Template Browser</h1>
      <p className="text-sm text-gray-600 mb-6">
        Browse available templates and clone them as drafts. Templates provide pre-configured
        specifications for common use cases.
      </p>

      <div className="space-y-4">
        {templates.map((t) => (
          <div key={t.category} className="border rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4">
              <div>
                <h3 className="font-semibold capitalize text-lg">{t.category}</h3>
                <p className="text-sm text-gray-600">{t.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handlePreview(t.category)}
                  className="px-3 py-1.5 border rounded-lg text-sm hover:bg-gray-50"
                >
                  {selectedCategory === t.category ? 'Hide' : 'Preview'}
                </button>
                <button
                  type="button"
                  onClick={() => handleClone(t.category)}
                  className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  {cloned === t.category ? 'Cloned!' : 'Clone to Draft'}
                </button>
              </div>
            </div>

            {selectedCategory === t.category && preview && (
              <div className="border-t bg-gray-50 p-4 space-y-4">
                {[
                  { title: 'Schema', content: preview.schema },
                  { title: 'Computation', content: preview.computation },
                  { title: 'Governance', content: preview.governance },
                  { title: 'Economics', content: preview.economic },
                ].map((section) => (
                  <div key={section.title}>
                    <h4 className="text-sm font-semibold text-gray-700 mb-1">{section.title}</h4>
                    <pre className="text-xs text-gray-600 whitespace-pre-wrap font-sans bg-white p-3 rounded border">
                      {section.content}
                    </pre>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {templates.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">No templates available.</p>
      )}
    </div>
  );
}
