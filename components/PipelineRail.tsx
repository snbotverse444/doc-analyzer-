'use client';

import styles from './PipelineRail.module.css';
import type { DocumentContext, PipelineStage } from '@/lib/types';

const STEPS: { key: PipelineStage; title: string; sub: string }[] = [
  { key: 'uploading', title: 'Upload', sub: 'Receive file' },
  { key: 'parsing', title: 'Parse', sub: 'Extract raw content' },
  { key: 'structuring', title: 'Structure', sub: 'LLM builds context' },
  { key: 'ready', title: 'Ready', sub: 'Context available' }
];

const STAGE_ORDER: PipelineStage[] = ['idle', 'uploading', 'parsing', 'structuring', 'ready'];

function stageIndex(stage: PipelineStage) {
  return STAGE_ORDER.indexOf(stage);
}

export default function PipelineRail({
  stage,
  context,
  onClear
}: {
  stage: PipelineStage;
  context: DocumentContext | null;
  onClear: () => void;
}) {
  const currentIndex = stageIndex(stage);

  return (
    <aside className={styles.rail}>
      <div className={styles.brand}>
        <div className={styles.brandMark} />
        <div>
          <div className={styles.brandName}>Doc Analyzer</div>
          <div className={styles.brandTag}>Document Context Engine</div>
        </div>
      </div>

      <p className={styles.sectionLabel}>Context pipeline</p>
      <div className={styles.stepper}>
        {STEPS.map((step, i) => {
          const thisIndex = stageIndex(step.key);
          const isDone = stage === 'error' ? false : currentIndex > thisIndex || (stage === 'ready' && step.key === 'ready');
          const isActive = stage !== 'error' && currentIndex === thisIndex && stage !== 'idle';
          const isError = stage === 'error' && thisIndex === currentIndex + 1;

          return (
            <div className={styles.step} key={step.key}>
              {i < STEPS.length - 1 && (
                <div
                  className={`${styles.stepLine} ${isDone ? styles.stepLineFilled : ''}`}
                />
              )}
              <div
                className={`${styles.stepDot} ${isDone ? styles.stepDotDone : ''} ${
                  isActive ? styles.stepDotActive : ''
                } ${isError ? styles.stepDotError : ''}`}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <div className={styles.stepText}>
                <div className={`${styles.stepTitle} ${isActive ? styles.stepTitleActive : ''}`}>
                  {step.title}
                </div>
                <div className={styles.stepSub}>{step.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.divider} />

      {context ? (
        <>
          <div className={styles.fileCard}>
            <div className={styles.fileName}>{context.fileName}</div>
            <div className={styles.fileMeta}>
              {context.fileType.toUpperCase()} · {context.sections.length} section
              {context.sections.length !== 1 ? 's' : ''} indexed
            </div>
          </div>

          {context.diagrams.length > 0 && (
            <div className={styles.diagramBadge}>
              ◆ {context.diagrams.length} diagram{context.diagrams.length !== 1 ? 's' : ''} detected
              &amp; described
            </div>
          )}

          <p className={styles.sectionLabel}>Sections in context</p>
          <div className={styles.pillList}>
            {context.sections.map((s) => (
              <span className={styles.pill} key={s.id} title={s.summary}>
                {s.title}
              </span>
            ))}
          </div>
        </>
      ) : (
        <p className={styles.emptyNote}>
          No document has been processed yet. Upload a file to build the context Doc Analyzer will use
          to answer your questions.
        </p>
      )}

      <div className={styles.spacer} />

      <button className={styles.clearButton} onClick={onClear} disabled={!context}>
        Clear context &amp; restart
      </button>
    </aside>
  );
}
