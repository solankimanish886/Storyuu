type Props = {
  title: string;
  spec: string;
  phase: number;
};

export default function PagePlaceholder({ title, spec, phase }: Props) {
  return (
    <div className="mx-auto max-w-container px-4 py-16">
      <p className="text-body text-neutral-500">{spec}</p>
      <h1 className="mt-2 text-display-l text-white">{title}</h1>
      <p className="mt-4 max-w-prose text-subheading text-neutral-300">
        Stubbed in Phase 0 (Foundation). Full implementation lands in Phase {phase}.
      </p>
    </div>
  );
}
