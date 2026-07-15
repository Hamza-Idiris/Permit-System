import React from 'react';
import { X, Check, Info } from 'lucide-react';

const ConfigDrawer = ({
    isOpen,
    onClose,
    columns,
    visibleColumns,
    setVisibleColumns,
    rowDensity,
    setRowDensity,
    onApply
}) => {
    if (!isOpen) return null;

    const toggleColumn = (id) => {
        if (visibleColumns.includes(id)) {
            if (visibleColumns.length > 2) { // Keep at least 2 columns
                setVisibleColumns(visibleColumns.filter(c => c !== id));
            }
        } else {
            setVisibleColumns([...visibleColumns, id]);
        }
    };

    const handleReset = () => {
        setVisibleColumns(columns.map(c => c.id));
        setRowDensity('comfortable');
    };

    return (
        <div className="fixed inset-0 z-[10001] overflow-hidden">
            <div
                className="absolute inset-0 bg-navy/20 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />

            <div className="absolute inset-y-0 right-0 w-full max-w-sm bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
                    <h2 className="text-xl font-bold text-navy">Configure Grid View</h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Toggle Columns */}
                    <div>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-bold text-navy uppercase tracking-wider">Toggle Columns</h3>
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                {visibleColumns.length} Visible
                            </span>
                        </div>

                        <div className="space-y-3">
                            {columns.map(col => (
                                <div
                                    key={col.id}
                                    onClick={() => !col.mandatory && toggleColumn(col.id)}
                                    className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${visibleColumns.includes(col.id)
                                            ? 'border-navy/10 bg-navy/[0.02]'
                                            : 'border-transparent opacity-60 grayscale'
                                        } ${col.mandatory ? 'cursor-not-allowed opacity-100' : ''}`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-colors ${visibleColumns.includes(col.id)
                                                ? 'bg-navy border-navy text-white'
                                                : 'border-gray-300 bg-white'
                                            }`}>
                                            {visibleColumns.includes(col.id) && <Check size={14} strokeWidth={3} />}
                                        </div>
                                        <span className="text-sm font-semibold text-navy">{col.label}</span>
                                    </div>
                                    {col.mandatory && (
                                        <span className="text-[9px] font-black text-white bg-gray-400 px-1.5 py-0.5 rounded-full uppercase">Required</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Row Density */}
                    <div>
                        <h3 className="text-sm font-bold text-navy uppercase tracking-wider mb-4">Row Density</h3>
                        <div className="flex p-1 bg-gray-100 rounded-xl">
                            <button
                                onClick={() => setRowDensity('comfortable')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${rowDensity === 'comfortable'
                                        ? 'bg-white text-navy shadow-sm'
                                        : 'text-gray-500 hover:text-navy'
                                    }`}
                            >
                                Comfortable
                            </button>
                            <button
                                onClick={() => setRowDensity('compact')}
                                className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition-all ${rowDensity === 'compact'
                                        ? 'bg-white text-navy shadow-sm'
                                        : 'text-gray-500 hover:text-navy'
                                    }`}
                            >
                                Compact
                            </button>
                        </div>
                        <p className="mt-3 text-[11px] text-gray-500 leading-relaxed">
                            Adjust how much data you see at once. Comfortable is best for reading, compact for bulk analysis.
                        </p>
                    </div>

                    {/* Info Note */}
                    <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 flex gap-3">
                        <Info className="text-indigo-500 shrink-0" size={18} />
                        <p className="text-[11px] text-indigo-700 leading-relaxed">
                            Your view configurations are saved locally to this device. To share views with your team, use the "Save as Preset" option.
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-100 flex items-center gap-4">
                    <button
                        onClick={handleReset}
                        className="flex-1 py-3 text-sm font-bold text-gray-500 hover:text-navy transition-colors"
                    >
                        Reset Defaults
                    </button>
                    <button
                        onClick={onApply}
                        className="flex-[2] py-3 bg-navy text-white rounded-xl font-bold text-sm shadow-lg shadow-navy/20 hover:scale-[1.02] active:scale-95 transition-all"
                    >
                        Apply View
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfigDrawer;
