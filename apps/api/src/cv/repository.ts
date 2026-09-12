export interface CandidateCvRecord {
  candidateId: string;
  storageKey: string | null;
  originalFilename: string | null;
}

export interface CvRepository {
  getByUserId(userId: string): Promise<CandidateCvRecord | null>;
  getDiscoverableByCandidateId(candidateId: string): Promise<CandidateCvRecord | null>;
  setByUserId(userId: string, storageKey: string, originalFilename: string): Promise<CandidateCvRecord | null>;
  clearByUserId(userId: string): Promise<CandidateCvRecord | null>;
}
