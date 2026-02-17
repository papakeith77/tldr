export type ThreadSegment = {
  id: string;
  text: string;
};

export type ThreadPayload = {
  title: string;
  authorHandle?: string;
  sourceUrl?: string;
  segments: ThreadSegment[];
};
