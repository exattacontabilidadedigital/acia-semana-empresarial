export interface PageHeroProps {
  title: string;
  subtitle?: string;
}

export default function PageHero({ title, subtitle }: PageHeroProps) {
  return (
    <section className="bg-gradient-to-br from-purple to-purple-dark py-16 pb-12 text-center">
      <div className="max-w-[1200px] mx-auto px-6">
        <h1 className="text-white text-4xl font-extrabold mb-2">
          {title}
        </h1>
        {subtitle && (
          <p className="text-cyan text-lg">{subtitle}</p>
        )}
      </div>
    </section>
  );
}
