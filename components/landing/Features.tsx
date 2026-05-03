import { Brain, ListChecks, StickyNote } from "lucide-react";
import { LANDING_FEATURES } from "@/lib/data/content";

const iconMap = {
  brain: Brain,
  "list-checks": ListChecks,
  "sticky-note": StickyNote,
};

export function Features() {
  return (
    <section className="py-24 px-6 bg-bg-secondary">
      <div className="max-w-6xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16 flex flex-col gap-4 items-center">
          <h2 className="text-3xl md:text-4xl font-bold text-text-heading">
            Everything you need to start
          </h2>
          <p className="text-lg text-text-secondary max-w-2xl mx-auto">
            A complete toolkit designed for aspiring entrepreneurs at day zero
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-3 gap-8 stagger-fade">
          {LANDING_FEATURES.map((feature, index) => {
            const Icon = iconMap[feature.icon as keyof typeof iconMap];
            return (
              <div
                key={index}
                className="group relative p-8 rounded-2xl bg-white border border-border hover:border-accent-primary/50 transition-all duration-200 card-hover cursor-pointer"
              >
                {/* Icon */}
                <div className="mb-6 size-12 rounded-xl bg-accent-primary/10 flex items-center justify-center group-hover:bg-accent-primary/20 transition-colors">
                  <Icon className="size-6 text-accent-primary" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-text-heading mb-3">
                  {feature.title}
                </h3>
                <p className="text-text-secondary leading-relaxed">
                  {feature.description}
                </p>

                {/* Subtle hover effect */}
                <div className="absolute inset-0 rounded-2xl bg-accent-glow opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// Made with Bob
