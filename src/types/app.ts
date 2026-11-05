// AUTOMATICALLY GENERATED TYPES - DO NOT EDIT

export type LookupValue = { key: string; label: string };
/** A raw record URL (applookup reference). NEVER render this directly
 *  in JSX — it is a URL, not a display value. Show the enriched `*Name`
 *  field or resolve it via the entity map instead. Assignable to/from
 *  string everywhere; the `& {}` keeps the alias NAME visible in tsc
 *  error messages (a plain primitive alias gets normalized away). */
export type RecordUrl = string & {};
export type GeoLocation = { lat: number; long: number; info?: string };

export type AttachmentType = 'file' | 'note' | 'url' | 'json';
export interface Attachment {
  id: string;
  type: AttachmentType;
  label: string | null;
  value: string | null;
  active: boolean;
  createdat?: string | null;
  updatedat?: string | null;
}

export interface AttachmentInput {
  type: AttachmentType;
  label?: string;
  value: string;
  active?: boolean;
}

export interface Veranstaltungen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    beginn?: string; // Format: YYYY-MM-DD oder ISO String
    ort?: string;
    beschreibung?: string;
    aktive_interaktion?: RecordUrl; // applookup -> URL zu 'Interaktionen' Record
  };
}

export interface Interaktionen {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    titel?: string;
    reihenfolge?: number;
    frage?: string;
    vorprompt?: string;
    endprompt?: string;
    zusammengefuehrter_text?: string;
    ki_antwort?: string;
    veranstaltung?: RecordUrl; // applookup -> URL zu 'Veranstaltungen' Record
  };
}

export interface Feedbacks {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kuerzel?: string;
    feedback_text?: string;
    absende_kennung?: string;
    interaktion?: RecordUrl; // applookup -> URL zu 'Interaktionen' Record
  };
}

export interface Teilnehmerkontakte {
  record_id: string;
  /** The API field. */
  created_at: string;
  updated_at: string | null;
  /** Alias of created_at, filled by the read helpers. The API sends
   *  snake_case only — reading `createdat` off a raw record yields
   *  undefined, which type-checks and then crashes at runtime. */
  createdat: string;
  updatedat: string | null;
  fields: {
    kuerzel?: string;
    email?: string;
    einwilligung?: boolean;
    veranstaltung?: RecordUrl; // applookup -> URL zu 'Veranstaltungen' Record
  };
}

export const APP_IDS = {
  VERANSTALTUNGEN: '6aec45ab094c84ab5eddf841',
  INTERAKTIONEN: '6aec45af13ac245de89b189c',
  FEEDBACKS: '6aec45af744e81e89f3464ec',
  TEILNEHMERKONTAKTE: '6aec45b09cc9844ea503bb4f',
} as const;


export const LOOKUP_OPTIONS: Record<string, Record<string, {key: string, label: string}[]>> = {};

export const FIELD_TYPES: Record<string, Record<string, string>> = {
  'veranstaltungen': {
    'titel': 'string/text',
    'beginn': 'date/datetimeminute',
    'ort': 'string/text',
    'beschreibung': 'string/textarea',
    'aktive_interaktion': 'applookup/select',
  },
  'interaktionen': {
    'titel': 'string/text',
    'reihenfolge': 'number',
    'frage': 'string/textarea',
    'vorprompt': 'string/textarea',
    'endprompt': 'string/textarea',
    'zusammengefuehrter_text': 'string/textarea',
    'ki_antwort': 'string/textarea',
    'veranstaltung': 'applookup/select',
  },
  'feedbacks': {
    'kuerzel': 'string/text',
    'feedback_text': 'string/textarea',
    'absende_kennung': 'string/text',
    'interaktion': 'applookup/select',
  },
  'teilnehmerkontakte': {
    'kuerzel': 'string/text',
    'email': 'string/email',
    'einwilligung': 'bool',
    'veranstaltung': 'applookup/select',
  },
};

export const HUB_TOPOLOGY: Record<string, { field: string; entity: string }[]> = {
};

type StripLookup<T> = {
  [K in keyof T]: T[K] extends LookupValue | undefined ? string | LookupValue | undefined
    : T[K] extends LookupValue[] | undefined ? string[] | LookupValue[] | undefined
    : T[K];
};

// Helper Types for creating new records (lookup fields as plain strings for API)
export type CreateVeranstaltungen = StripLookup<Veranstaltungen['fields']>;
export type CreateInteraktionen = StripLookup<Interaktionen['fields']>;
export type CreateFeedbacks = StripLookup<Feedbacks['fields']>;
export type CreateTeilnehmerkontakte = StripLookup<Teilnehmerkontakte['fields']>;