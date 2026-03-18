'use client';

import type {
  LoadProfile,
  RampConfig,
  LoadPatternConfig,
  DurationConfig,
  DataSource,
  ThinkTimeConfig,
} from '../../types';
import VirtualUsersSection from './VirtualUsersSection';
import LoadPatternSection from './LoadPatternSection';
import DurationSection from './DurationSection';
import DataSourcesSection from './DataSourcesSection';
import ThinkTimeDefaultsSection from './ThinkTimeDefaultsSection';

interface Props {
  loadProfile: LoadProfile;
  errors: Record<string, string>;
  onUpdateField: <K extends keyof LoadProfile>(field: K, value: LoadProfile[K]) => void;
  onSetRampUp: (ramp: RampConfig) => void;
  onSetRampDown: (ramp: RampConfig) => void;
  onSetLoadPattern: (pattern: LoadPatternConfig) => void;
  onSetDuration: (duration: DurationConfig) => void;
  onSetDataSources: (sources: DataSource[]) => void;
  onSetThinkTimeDefaults: (thinkTime: ThinkTimeConfig) => void;
}

export default function LoadProfileTab({
  loadProfile,
  errors,
  onUpdateField,
  onSetRampUp,
  onSetRampDown,
  onSetLoadPattern,
  onSetDuration,
  onSetDataSources,
  onSetThinkTimeDefaults,
}: Props) {
  return (
    <div className="space-y-4 p-5">
      <VirtualUsersSection
        virtualUsers={loadProfile.virtual_users}
        rampUp={loadProfile.ramp_up}
        rampDown={loadProfile.ramp_down}
        patternType={loadProfile.pattern.type}
        onVirtualUsersChange={v => onUpdateField('virtual_users', v)}
        onRampUpChange={onSetRampUp}
        onRampDownChange={onSetRampDown}
        errors={errors}
      />
      <LoadPatternSection
        pattern={loadProfile.pattern}
        onChange={onSetLoadPattern}
      />
      <DurationSection
        duration={loadProfile.duration}
        patternType={loadProfile.pattern.type}
        onChange={onSetDuration}
      />
      <DataSourcesSection
        dataSources={loadProfile.data_sources}
        onChange={onSetDataSources}
      />
      <ThinkTimeDefaultsSection
        thinkTime={loadProfile.think_time_defaults}
        onChange={onSetThinkTimeDefaults}
      />
    </div>
  );
}
