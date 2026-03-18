import { describe, it, expect } from 'vitest';
import { getTemplate, listTemplates } from '../templates';
import { schemaSpecSchema } from '../schema';
import { computationSpecSchema } from '../computation';
import { governanceSpecSchema } from '../governance';
import { economicSpecSchema } from '../economic';

describe('templates', () => {
  it('should list all available templates', () => {
    const templates = listTemplates();
    expect(templates.length).toBeGreaterThanOrEqual(3);
    const categories = templates.map(t => t.category);
    expect(categories).toContain('generic');
    expect(categories).toContain('education');
    expect(categories).toContain('healthcare');
  });

  it('should return undefined for unknown template', () => {
    expect(getTemplate('nonexistent')).toBeUndefined();
  });

  describe.each(['generic', 'education', 'healthcare'])('template: %s', (category) => {
    it('should return a valid template', () => {
      const template = getTemplate(category);
      expect(template).toBeDefined();
      expect(template!.category).toBe(category);
    });

    it('should have a valid schema spec', () => {
      const template = getTemplate(category)!;
      const result = schemaSpecSchema.safeParse(template.schema);
      expect(result.success).toBe(true);
    });

    it('should have a valid computation spec', () => {
      const template = getTemplate(category)!;
      const result = computationSpecSchema.safeParse(template.computation);
      expect(result.success).toBe(true);
    });

    it('should have a valid governance spec', () => {
      const template = getTemplate(category)!;
      const result = governanceSpecSchema.safeParse(template.governance);
      expect(result.success).toBe(true);
    });

    it('should have a valid economic spec', () => {
      const template = getTemplate(category)!;
      const result = economicSpecSchema.safeParse(template.economic);
      expect(result.success).toBe(true);
    });
  });
});
