'use client';

import { VisibilityMode, SectionVisibility } from '@pacct/protocol-ts';
import type { GovernanceData } from '../wizard-state';
import { formatDuration } from '@/lib/utils/duration';

interface StepGovernanceProps {
  data: GovernanceData;
  onChange: (data: Partial<GovernanceData>) => void;
  errors: string[];
}

const SECTION_VISIBILITY_OPTIONS = [
  { value: SectionVisibility.Full, label: 'Full' },
  { value: SectionVisibility.SummaryOnly, label: 'Summary Only' },
  { value: SectionVisibility.Hidden, label: 'Hidden' },
];

// Duration presets in ms
const DURATION_PRESETS = [
  { label: '1 hour', ms: 3600000 },
  { label: '12 hours', ms: 43200000 },
  { label: '1 day', ms: 86400000 },
  { label: '3 days', ms: 259200000 },
  { label: '7 days', ms: 604800000 },
  { label: '30 days', ms: 2592000000 },
];

function DurationInput({
  label,
  value,
  onChangeMs,
  helpText,
}: {
  label: string;
  value: number;
  onChangeMs: (ms: number) => void;
  helpText?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="flex items-center gap-2">
        <select
          value={DURATION_PRESETS.find((p) => p.ms === value) ? value : 'custom'}
          onChange={(e) => {
            if (e.target.value !== 'custom') onChangeMs(parseInt(e.target.value, 10));
          }}
          className="px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
        >
          {DURATION_PRESETS.map((p) => (
            <option key={p.ms} value={p.ms}>
              {p.label}
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
        <input
          type="number"
          value={value}
          onChange={(e) => onChangeMs(parseInt(e.target.value, 10) || 0)}
          className="w-36 px-2 py-1.5 border rounded text-sm focus:ring-2 focus:ring-blue-500"
          min={1}
        />
        <span className="text-xs text-gray-500">ms</span>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        {formatDuration(value)}
        {helpText ? ` - ${helpText}` : ''}
      </p>
    </div>
  );
}

export default function StepGovernance({ data, onChange, errors }: StepGovernanceProps) {
  const updateScheduleEntry = (
    index: number,
    updates: Partial<{ memberCountMin: number; memberCountMax: number; threshold: number }>,
  ) => {
    const newSchedule = data.admissionSchedule.map((entry, i) =>
      i === index ? { ...entry, ...updates } : entry,
    );
    onChange({ admissionSchedule: newSchedule });
  };

  const addScheduleEntry = () => {
    const last = data.admissionSchedule[data.admissionSchedule.length - 1];
    const newMin = last ? last.memberCountMax + 1 : 1;
    onChange({
      admissionSchedule: [
        ...data.admissionSchedule,
        { memberCountMin: newMin, memberCountMax: newMin + 4, threshold: 0.75 },
      ],
    });
  };

  const removeScheduleEntry = (index: number) => {
    if (data.admissionSchedule.length <= 1) return;
    onChange({ admissionSchedule: data.admissionSchedule.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-semibold">Governance</h2>

      {/* Membership Policy */}
      <fieldset className="border rounded-lg p-4">
        <legend className="text-sm font-semibold px-2 text-gray-700">Membership Policy</legend>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Min Active Members <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={data.minActiveMembers}
              onChange={(e) => onChange({ minActiveMembers: parseInt(e.target.value, 10) || 3 })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              min={3}
            />
            <p className="text-xs text-gray-500 mt-1">Minimum 3 for secure computation</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Max Members</label>
            <input
              type="number"
              value={data.maxMembers}
              onChange={(e) => onChange({ maxMembers: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="No limit"
              min={3}
            />
          </div>
        </div>
      </fieldset>

      {/* Visibility Policy */}
      <fieldset className="border rounded-lg p-4">
        <legend className="text-sm font-semibold px-2 text-gray-700">Visibility Policy</legend>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mode</label>
          <select
            value={data.visibilityMode}
            onChange={(e) => onChange({ visibilityMode: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={VisibilityMode.Full}>Full</option>
            <option value={VisibilityMode.Partial}>Partial</option>
            <option value={VisibilityMode.None}>None</option>
          </select>
        </div>

        {data.visibilityMode === VisibilityMode.Partial && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            {(['schema', 'computation', 'governance', 'economic'] as const).map((section) => (
              <div key={section}>
                <label className="block text-xs font-medium text-gray-600 mb-1 capitalize">
                  {section}
                </label>
                <select
                  value={data.sectionVisibility[section]}
                  onChange={(e) =>
                    onChange({
                      sectionVisibility: { ...data.sectionVisibility, [section]: e.target.value },
                    })
                  }
                  className="w-full px-2 py-1.5 border rounded text-sm"
                >
                  {SECTION_VISIBILITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        )}
      </fieldset>

      {/* Join Policy */}
      <fieldset className="border rounded-lg p-4 space-y-4">
        <legend className="text-sm font-semibold px-2 text-gray-700">Join Policy</legend>
        <DurationInput
          label="Approval Timeout"
          value={data.approvalTimeoutMs}
          onChangeMs={(ms) => onChange({ approvalTimeoutMs: ms })}
          helpText="How long existing members have to vote on a join request"
        />
        <DurationInput
          label="Acceptance Timeout"
          value={data.acceptanceTimeoutMs}
          onChangeMs={(ms) => onChange({ acceptanceTimeoutMs: ms })}
          helpText="How long an approved applicant has to accept and join"
        />
      </fieldset>

      {/* Consensus Policy */}
      <fieldset className="border rounded-lg p-4 space-y-4">
        <legend className="text-sm font-semibold px-2 text-gray-700">Consensus Policy</legend>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Dissolution Threshold
          </label>
          <input
            type="number"
            value={data.dissolutionThreshold}
            onChange={(e) => onChange({ dissolutionThreshold: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            min={0}
            max={1}
            step={0.05}
          />
          <p className="text-xs text-gray-500 mt-1">
            Fraction of members required to vote for dissolution (0-1)
          </p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">Admission Schedule</label>
            <button
              type="button"
              onClick={addScheduleEntry}
              className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
            >
              + Add Range
            </button>
          </div>
          <p className="text-xs text-gray-500 mb-2">
            Define approval thresholds for different member count ranges. Must start at 1 with no
            gaps.
          </p>
          <div className="space-y-2">
            {data.admissionSchedule.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="number"
                  value={entry.memberCountMin}
                  onChange={(e) =>
                    updateScheduleEntry(index, { memberCountMin: parseInt(e.target.value, 10) || 1 })
                  }
                  className="w-20 px-2 py-1 border rounded text-sm"
                  min={1}
                  placeholder="Min"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="number"
                  value={entry.memberCountMax}
                  onChange={(e) =>
                    updateScheduleEntry(index, { memberCountMax: parseInt(e.target.value, 10) || 1 })
                  }
                  className="w-20 px-2 py-1 border rounded text-sm"
                  min={1}
                  placeholder="Max"
                />
                <span className="text-gray-400">members: threshold</span>
                <input
                  type="number"
                  value={entry.threshold}
                  onChange={(e) =>
                    updateScheduleEntry(index, { threshold: parseFloat(e.target.value) || 0 })
                  }
                  className="w-20 px-2 py-1 border rounded text-sm"
                  min={0}
                  max={1}
                  step={0.05}
                />
                {data.admissionSchedule.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeScheduleEntry(index)}
                    className="px-2 py-1 text-xs text-red-600 border rounded hover:bg-red-50"
                  >
                    Remove
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </fieldset>

      {/* Run Policy */}
      <fieldset className="border rounded-lg p-4 space-y-4">
        <legend className="text-sm font-semibold px-2 text-gray-700">Run Policy</legend>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Initiation Mode
          </label>
          <input
            type="text"
            value="Restricted Manual"
            disabled
            className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500"
          />
          <p className="text-xs text-gray-500 mt-1">Only restricted manual is supported in v1.</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Allowed Initiators
          </label>
          <select
            value={data.allowedInitiators}
            onChange={(e) => onChange({ allowedInitiators: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="any_member">Any Member</option>
            <option value="creator_only">Creator Only</option>
          </select>
        </div>

        <DurationInput
          label="Minimum Interval Between Runs"
          value={data.minimumIntervalMs}
          onChangeMs={(ms) => onChange({ minimumIntervalMs: ms })}
        />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Max Runs Per Period
            </label>
            <input
              type="number"
              value={data.maxRunsPerPeriod}
              onChange={(e) => onChange({ maxRunsPerPeriod: parseInt(e.target.value, 10) || 1 })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              min={1}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Period Length (days)
            </label>
            <input
              type="number"
              value={data.periodLengthDays}
              onChange={(e) => onChange({ periodLengthDays: parseInt(e.target.value, 10) || 1 })}
              className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
              min={1}
            />
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.requireCostEstimate}
              onChange={(e) => onChange({ requireCostEstimate: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">Require cost estimate before run</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={data.allMembersOnlineRequired}
              onChange={(e) => onChange({ allMembersOnlineRequired: e.target.checked })}
              className="rounded border-gray-300"
            />
            <span className="text-sm text-gray-700">All members must be online</span>
          </label>
        </div>
      </fieldset>

      {/* Dissolution Policy */}
      <fieldset className="border rounded-lg p-4 space-y-4">
        <legend className="text-sm font-semibold px-2 text-gray-700">Dissolution Policy</legend>
        <DurationInput
          label="Pre-Activation Timeout"
          value={data.preActivationTimeoutMs}
          onChangeMs={(ms) => onChange({ preActivationTimeoutMs: ms })}
          helpText="Auto-dissolve if network never activates within this time"
        />
        <DurationInput
          label="Post-Activation Inactivity Timeout"
          value={data.postActivationInactivityTimeoutMs}
          onChangeMs={(ms) => onChange({ postActivationInactivityTimeoutMs: ms })}
          helpText="Auto-dissolve after this period of inactivity"
        />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Warn Before Dissolve (optional)
          </label>
          <input
            type="number"
            value={data.warnBeforeDissolveMs}
            onChange={(e) => onChange({ warnBeforeDissolveMs: e.target.value })}
            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            placeholder="No warning"
            min={0}
          />
          <p className="text-xs text-gray-500 mt-1">
            Milliseconds before dissolution to warn members. Leave empty for no warning.
          </p>
        </div>
      </fieldset>

      {/* Expulsion Policy */}
      <fieldset className="border rounded-lg p-4 space-y-3">
        <legend className="text-sm font-semibold px-2 text-gray-700">
          Expulsion Policy (Optional)
        </legend>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={data.expulsionEnabled}
            onChange={(e) => onChange({ expulsionEnabled: e.target.checked })}
            className="rounded border-gray-300"
          />
          <span className="text-sm text-gray-700">Enable expulsion</span>
        </label>

        {data.expulsionEnabled && (
          <>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={data.expulsionRequireReason}
                onChange={(e) => onChange({ expulsionRequireReason: e.target.checked })}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-700">Require reason for expulsion</span>
            </label>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expulsion Threshold
              </label>
              <input
                type="number"
                value={data.expulsionThreshold}
                onChange={(e) => onChange({ expulsionThreshold: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 0.75"
                min={0}
                max={1}
                step={0.05}
              />
              <p className="text-xs text-gray-500 mt-1">
                Fraction of members required to vote for expulsion (0-1)
              </p>
            </div>
          </>
        )}
      </fieldset>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
          <p className="text-sm font-medium text-red-800 mb-1">Validation Errors:</p>
          <ul className="list-disc list-inside text-sm text-red-700">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
