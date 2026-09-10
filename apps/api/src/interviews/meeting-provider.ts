export interface MeetingProvisionInput {
  title: string;
  startsAtUtc: Date;
  durationMinutes: number;
  timezone: string;
}

export interface MeetingProvisionResult {
  provider: string;
  externalId: string;
  joinUrl: string;
}

export interface MeetingProvider {
  createMeeting(input: MeetingProvisionInput): Promise<MeetingProvisionResult>;
}

export class DeferredGoogleMeetProvider implements MeetingProvider {
  async createMeeting(_input: MeetingProvisionInput): Promise<MeetingProvisionResult> {
    throw new Error('GOOGLE_MEET_NOT_CONFIGURED');
  }
}
