import './ResponsiveTabs.css';

export default function ResponsiveTabs({ tabs, active, onChange }) {
  return (
    <div className="responsive-tabs-wrapper">
      <div className="responsive-tabs-scroll">
        <div className="responsive-tabs-inner">
          {tabs.map(t => (
            <button
              key={t.id}
              className={`responsive-tab-btn${active === t.id ? ' active' : ''}`}
              onClick={() => onChange(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
