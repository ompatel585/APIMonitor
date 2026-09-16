import type { components } from '@/types/api/generated';

export type Monitor = components['schemas']['MonitorResponseDto'];
export type MonitorStatus = Monitor['status'];
