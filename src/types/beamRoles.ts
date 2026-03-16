export interface BeamRoleTask {
  id?: string;
  title?: string;
  description?: string;
  status?: string;
  dueAt?: string;
}

export interface BeamRole {
  id?: string;
  roleId?: string;
  clientId?: string;
  clientName?: string;
  roleTitle?: string;
  summary?: string;
  cityHint?: string;
  requirements?: string[];
  requirementTags?: string[];
  timebox?: string;
  tasks?: BeamRoleTask[];
  status?: string;
  publishedAt?: string;
}

export interface BeamRoleResponse {
  roles?: BeamRole[];
}
