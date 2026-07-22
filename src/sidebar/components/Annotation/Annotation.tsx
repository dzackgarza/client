import {
  CardActions,
  formatDateTime,
  Spinner,
} from '@hypothesis/frontend-shared';
import { useMemo } from 'preact/hooks';

import type { Annotation as IAnnotation } from '../../../types/api';
import type { SidebarSettings } from '../../../types/config';
import {
  annotationRole,
  isOrphan,
  isSaved,
  description,
  quote,
  shape,
} from '../../helpers/annotation-metadata';
import { annotationDisplayName } from '../../helpers/annotation-user';
import { withServices } from '../../service-context';
import type { AnnotationsService } from '../../services/annotations';
import { useSidebarStore } from '../../store';
import ModerationControl from '../moderation/ModerationControl';
import AnnotationActionBar from './AnnotationActionBar';
import AnnotationBody from './AnnotationBody';
import AnnotationEditor from './AnnotationEditor';
import AnnotationHeader from './AnnotationHeader';
import AnnotationQuote from './AnnotationQuote';
import AnnotationReplyToggle from './AnnotationReplyToggle';
import AnnotationThumbnail from './AnnotationThumbnail';

function SavingMessage() {
  return (
    // The whole annotation mini-interface becomes this spinner while the save
    // (which normalizes the quote synchronously on the server) is in flight:
    // it blocks the editor, offers no cancel, and shows no raw quote.
    <div
      className="flex items-center justify-center gap-x-2 py-8 text-color-text-light"
      data-testid="saving-message"
    >
      <Spinner size="md" />
      <div className="font-medium">Saving...</div>
    </div>
  );
}

export type AnnotationProps = {
  annotation: IAnnotation;
  isReply: boolean;
  /** Number of replies to this annotation's thread */
  replyCount: number;
  /** Is the thread to which this annotation belongs currently collapsed? */
  threadIsCollapsed: boolean;
  /**
   * Callback to expand/collapse reply threads. The presence of a function
   * indicates a toggle should be rendered.
   */
  onToggleReplies?: () => void;

  // injected
  annotationsService: AnnotationsService;
  settings: SidebarSettings;
};

/**
 * A single annotation.
 *
 * @param {AnnotationProps} props
 */
function Annotation({
  annotation,
  isReply,
  onToggleReplies,
  replyCount,
  threadIsCollapsed,
  annotationsService,
  settings,
}: AnnotationProps) {
  const store = useSidebarStore();

  const annotationQuote = quote(annotation);
  const targetDescription = description(annotation);

  const draft = store.getDraft(annotation);
  const userid = store.profile().userid;

  const isHovered = store.isAnnotationHovered(annotation.$tag);
  const isSaving = store.isSavingAnnotation(annotation);

  const isEditing = !!draft && !isSaving;
  const isCollapsedReply = isReply && threadIsCollapsed;

  const showActions = !isSaving && !isEditing && isSaved(annotation);

  const defaultAuthority = store.defaultAuthority();
  const displayNamesEnabled = store.isFeatureEnabled('client_display_names');

  const onReply = () => {
    if (isSaved(annotation) && userid) {
      annotationsService.reply(annotation, userid);
    }
  };

  const authorName = useMemo(
    () =>
      annotationDisplayName(annotation, defaultAuthority, displayNamesEnabled),
    [annotation, defaultAuthority, displayNamesEnabled],
  );
  const formattedDate = useMemo(
    () => formatDateTime(annotation.created),
    [annotation.created],
  );
  const role = annotationRole(annotation, settings);
  const annotationDescription = isSaved(annotation)
    ? role
    : `New ${role.toLowerCase()}`;
  const state = store.isAnnotationHighlighted(annotation)
    ? ' - Highlighted'
    : '';

  const targetShape = useMemo(() => shape(annotation), [annotation]);

  return (
    <article
      className="space-y-4"
      aria-label={`${annotationDescription} by ${authorName} on ${formattedDate}${state}`}
    >
      <AnnotationHeader
        annotation={annotation}
        isEditing={isEditing}
        replyCount={replyCount}
        threadIsCollapsed={threadIsCollapsed}
      />
      {targetShape && (
        <AnnotationThumbnail
          tag={annotation.$tag}
          textInImage={targetShape.text}
          description={targetDescription}
          // Don't show the description when it is also visible in an input field.
          showDescription={!isEditing}
        />
      )}
      {annotationQuote && !isSaving && (
        <AnnotationQuote
          draftQuote={!isSaved(annotation) ? annotationQuote : undefined}
          normalizedQuote={annotation.normalized_quote}
          normalizationError={annotation.normalization_error}
          isHovered={isHovered}
          isOrphan={isOrphan(annotation)}
        />
      )}

      {isSaving && <SavingMessage />}

      {!isCollapsedReply && !isEditing && !isSaving && (
        <AnnotationBody annotation={annotation} />
      )}

      {isEditing && <AnnotationEditor annotation={annotation} draft={draft} />}

      {!isCollapsedReply && (
        <footer className="flex items-start">
          <div className="flex flex-col items-start gap-y-1">
            {showActions && (
              <ModerationControl
                annotation={annotation}
                groupIsPreModerated={!!store.focusedGroup()?.pre_moderated}
                badgeClasses="mt-0.5"
              />
            )}
            {onToggleReplies && (
              <AnnotationReplyToggle
                onToggleReplies={onToggleReplies}
                replyCount={replyCount}
                threadIsCollapsed={threadIsCollapsed}
              />
            )}
          </div>
          {showActions && (
            <CardActions classes="grow">
              <AnnotationActionBar annotation={annotation} onReply={onReply} />
            </CardActions>
          )}
        </footer>
      )}
    </article>
  );
}

export default withServices(Annotation, ['annotationsService', 'settings']);
