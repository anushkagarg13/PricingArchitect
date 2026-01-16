
import React from 'react';

interface Props {
  title: string;
  icon: string;
  description?: string;
}

const SectionHeader: React.FC<Props> = ({ title, icon, description }) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-2">
        <div className="text-slate-400 w-5">
          <i className={`fa-solid ${icon} text-xs`}></i>
        </div>
        <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none">
          {title}
        </h3>
      </div>
      {description && <p className="text-[10px] text-slate-400 pl-7 leading-relaxed font-medium">{description}</p>}
    </div>
  );
};

export default SectionHeader;
