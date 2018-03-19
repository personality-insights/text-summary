export = PersonalityTextSummary;

declare type Locale = 'en' | 'es' | 'ja' | 'ko';
declare type Version = 'v2' | 'v3';

declare class PersonalityTextSummary {
  constructor(options?: {
    locale?: Locale,
    version?: Version
  });

  defaultOptions(): {
    locale: Locale,
    version: Version
  };

  setLocale(locale: Locale): void;

  getSummary(profile: any): string;

  assemble(profile: any): string[][];

  assembleTraits(traits: any): string[];

  assembleFacets(traits: any): string[];

  assembleNeeds(needs: any): string[];

  assembleValues(values: any): string[];

  getCircumplexAdjective(p1: any, p2: any, order: any): string;

  getValueInfo(value: any): {
    name: string,
    term: string,
    description: string
  };

  getFacetInfo(facet: any): {
    name: string,
    term: string,
    description: string
  };

  getFacet(id: any): {
    LowTerm: string,
    LowDescription: string,
    HighTerm: string,
    HighDescription: string,
    Big5: string
  };

  getTrait(id: any): {
    HighDescription: string,
    LowDescription: string
  };
}
