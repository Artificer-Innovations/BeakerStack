import { useCallback, useEffect, useState } from 'react';
import { AppHeaderWithAdmin } from '../../../apps/web/src/components/AppHeaderWithAdmin';
import { ContentContainer } from '@beakerstack/shared/components/layout/ContentContainer.web';
import { useDemoCollections } from '../billing/useDemoCollections';
import { AnnotatedPrimitive } from '../components/dashboard/AnnotatedPrimitive';
import { BooleanFeatureTiles } from '../components/dashboard/BooleanFeatureTiles';
import { CollectionDetail } from '../components/dashboard/CollectionDetail';
import { CollectionsGrid } from '../components/dashboard/CollectionsGrid';
import { DemoBanner } from '../components/dashboard/DemoBanner';
import { DeveloperConsole } from '../components/dashboard/DeveloperConsole';
import { FeatureGateCard } from '../components/dashboard/FeatureGateCard';
import { UsageStrip } from '../components/dashboard/UsageStrip';
import type { ActivityEntry } from '../components/dashboard/types';

export default function DashboardPage() {
  const [activityLog, setActivityLog] = useState<ActivityEntry[]>([]);
  const appendActivity = useCallback(
    (entry: Omit<ActivityEntry, 'id' | 'at'>) => {
      setActivityLog(prev =>
        [{ ...entry, id: crypto.randomUUID(), at: new Date() }, ...prev].slice(
          0,
          30
        )
      );
    },
    []
  );

  const [selectedCollectionId, setSelectedCollectionId] = useState<
    string | null
  >(null);

  const {
    collections,
    loading: collectionsLoading,
    error: collectionsError,
    addCollection,
    deleteCollection,
    addItem,
  } = useDemoCollections();

  useEffect(() => {
    if (collections.length === 0) {
      setSelectedCollectionId(null);
      return;
    }
    if (selectedCollectionId === null) {
      setSelectedCollectionId(collections[0].id);
      return;
    }
    if (!collections.find(c => c.id === selectedCollectionId)) {
      setSelectedCollectionId(collections[0].id);
    }
  }, [collections, selectedCollectionId]);

  const selectedCollection = collections.find(
    c => c.id === selectedCollectionId
  );

  return (
    <div className='min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col'>
      <AppHeaderWithAdmin />

      <ContentContainer as='main' className='flex-1 py-6 space-y-6'>
        <DemoBanner />

        <AnnotatedPrimitive
          tag='useUsage("ai_summarize")'
          variant='usage'
          tooltip='Meter reads from useUsage; the Simulate button records usage via billing_record_usage_event.'
        >
          <UsageStrip onActivity={appendActivity} />
        </AnnotatedPrimitive>

        <AnnotatedPrimitive
          tag='FeatureGate + useFeature("feature_a")'
          variant='gate'
          tooltip='When useFeature("feature_a").enabled is false, FeatureGate renders the fallback; when true, children render.'
        >
          <FeatureGateCard />
        </AnnotatedPrimitive>

        <AnnotatedPrimitive
          tag='useFeature("containers_per_account_max")'
          variant='feature'
          tooltip='Numeric cap from useFeature; New collection enforces containers_per_account_max.'
        >
          <CollectionsGrid
            collections={collections}
            loading={collectionsLoading}
            error={collectionsError}
            selectedId={selectedCollectionId}
            onSelect={setSelectedCollectionId}
            addCollection={addCollection}
            deleteCollection={deleteCollection}
            onActivity={appendActivity}
          />
        </AnnotatedPrimitive>

        <AnnotatedPrimitive
          tag='useFeature("items_per_container_max")'
          variant='feature'
          tooltip='Per-collection item cap from useFeature; add-item enforces items_per_container_max.'
        >
          <CollectionDetail
            collection={selectedCollection}
            addItem={addItem}
            onActivity={appendActivity}
          />
        </AnnotatedPrimitive>

        <AnnotatedPrimitive
          tag='useFeature("feature_a") · useFeature("feature_b")'
          variant='feature'
          tooltip='Boolean features reflect plan config; enabled/disabled state changes with the active plan.'
        >
          <BooleanFeatureTiles />
        </AnnotatedPrimitive>
      </ContentContainer>

      <DeveloperConsole activityLog={activityLog} />
    </div>
  );
}
