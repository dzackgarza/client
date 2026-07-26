import { useState } from 'preact/hooks';

import type { AnnotationData } from '../types/annotator';

export const AGENT_QUEUE_TAG = 'agent:queue';

type QueueableAnnotation = AnnotationData & { tags?: string[] };

let enabled = false;

export function agentQueueEnabled(): boolean {
  return enabled;
}

export function setAgentQueueEnabled(value: boolean) {
  enabled = value;
}

export function flagForAgent(
  annotation: QueueableAnnotation,
): QueueableAnnotation {
  if (!enabled || annotation.tags?.includes(AGENT_QUEUE_TAG)) {
    return annotation;
  }
  return {
    ...annotation,
    tags: [...(annotation.tags ?? []), AGENT_QUEUE_TAG],
  };
}

export function useAgentQueue() {
  const [isEnabled, setIsEnabled] = useState(enabled);
  const toggle = () => {
    enabled = !enabled;
    setIsEnabled(enabled);
  };
  return { enabled: isEnabled, toggle };
}
