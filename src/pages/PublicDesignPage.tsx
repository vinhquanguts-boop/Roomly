import { useQuery } from '@tanstack/react-query';
import { Link, useParams } from 'react-router';
import { ArrowLeft, ExternalLink, ImageIcon, PackageSearch, Palette, ReceiptText, Sparkles, Tag, Truck } from 'lucide-react';
import { LightCard } from '@/components/LightCard';
import { Navigation } from '@/components/Navigation';
import { Button } from '@/components/ui/button';
import { getPublicDesign, productClickUrl, type PublicDesign, type ShoppingItem } from '@/lib/api';
import { trackEvent } from '@/lib/analytics';

function formatMoney(value: number, currency: string): string {
  return new Intl.NumberFormat('en-AU', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

function PublicProductCard({ design, item }: { design: PublicDesign; item: ShoppingItem }) {
  const product = item.product;

  if (!product) {
    return null;
  }

  return (
    <LightCard className="overflow-hidden p-0">
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.title} className="aspect-[1.5/1] w-full bg-bg-inset object-cover" loading="lazy" />
      ) : (
        <div className="flex aspect-[1.5/1] items-center justify-center bg-bg-inset text-text-secondary">
          <PackageSearch className="size-8" aria-hidden="true" />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <span className="rounded-full bg-secondary-muted px-3 py-1 text-xs font-bold text-text-primary">
            {product.retailer}
          </span>
          <span className="text-sm font-bold text-success">{formatMoney(product.price, design.currency)}</span>
        </div>
        <h3 className="mt-3 text-base font-bold leading-snug">{product.title}</h3>
        <p className="mt-2 text-sm leading-6 text-text-secondary">
          {item.rationale ?? product.description ?? 'Matched to the design plan and budget.'}
        </p>
        <div className="mt-3 flex items-center gap-2 text-sm font-semibold text-text-secondary">
          <Truck className="size-4 text-accent" aria-hidden="true" />
          {product.deliveryEstimate ?? 'Delivery estimate unavailable'}
        </div>
        <Button asChild className="mt-4 h-10 w-full rounded-md">
          <a href={productClickUrl(design.id, product.id)} target="_blank" rel="noreferrer" onClick={() => trackEvent('product_click', { retailer: product.retailer })}>
            View at {product.retailer}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </Button>
      </div>
    </LightCard>
  );
}

export function PublicDesignPage() {
  const { slug } = useParams();
  const publicQuery = useQuery({
    queryKey: ['public-design', slug],
    queryFn: async () => {
      if (!slug) throw new Error('Missing public design slug.');
      return getPublicDesign(slug);
    },
    enabled: Boolean(slug),
    retry: false,
  });

  const design = publicQuery.data?.design;
  const plan = design?.designPlan;
  const shoppingItems = (design?.items ?? []).filter((item) => item.product);
  const shoppingTotal = shoppingItems.reduce((total, item) => total + (item.priceAtGeneration ?? item.product?.price ?? 0), 0);

  return (
    <>
      <Navigation />
      <main className="min-h-dvh bg-bg-base px-5 py-10 text-text-primary md:px-10">
        <div className="mx-auto max-w-[1120px]">
          <Button asChild variant="ghost" className="mb-6 gap-2 px-0 hover:bg-transparent">
            <Link to="/explore">
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back to explore
            </Link>
          </Button>

          {publicQuery.isPending ? (
            <LightCard className="p-6 text-sm font-semibold text-text-secondary">Loading public design...</LightCard>
          ) : publicQuery.isError || !design || !plan ? (
            <LightCard className="mx-auto max-w-[620px] p-8 text-center">
              <h1 className="font-display text-[34px] font-semibold">Public design not found</h1>
              <p className="mt-3 text-sm leading-6 text-text-secondary">
                This Roomly design may have been unpublished.
              </p>
              <Button asChild className="mt-6">
                <Link to="/explore">Browse public designs</Link>
              </Button>
            </LightCard>
          ) : (
            <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.24em] text-accent">Published Roomly design</p>
                <h1 className="mt-3 font-display text-[38px] font-semibold leading-tight md:text-[54px]">
                  {plan.styleDirection}
                </h1>
                <p className="mt-5 max-w-[560px] text-base leading-7 text-text-secondary">
                  A public room plan with a {formatMoney(design.budget, design.currency)} budget and a matched shopping list.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {design.styleTags.map((tag) => (
                    <span key={tag} className="inline-flex items-center gap-1 rounded-full bg-secondary-muted px-3 py-1 text-xs font-bold text-text-secondary">
                      <Tag className="size-3" aria-hidden="true" />
                      {tag}
                    </span>
                  ))}
                </div>

                <LightCard className="mt-7 overflow-hidden">
                  {design.renderUrl ? (
                    <img src={design.renderUrl} alt="Published Roomly design preview" className="w-full bg-bg-inset object-cover" />
                  ) : (
                    <div className="flex min-h-[320px] flex-col items-center justify-center bg-bg-inset px-6 text-center">
                      <ImageIcon className="size-8 text-accent" aria-hidden="true" />
                      <p className="mt-4 text-sm font-bold text-text-primary">Preview image unavailable</p>
                    </div>
                  )}
                </LightCard>

                <LightCard className="mt-5 p-5">
                  <div className="flex items-center gap-3">
                    <Sparkles className="size-5 text-accent" aria-hidden="true" />
                    <h2 className="text-xl font-bold">Design principles</h2>
                  </div>
                  <ul className="mt-4 space-y-3 text-sm leading-6 text-text-secondary">
                    {plan.designPrinciples.map((principle) => (
                      <li key={principle}>{principle}</li>
                    ))}
                  </ul>
                </LightCard>
              </div>

              <div className="space-y-4">
                <LightCard className="p-5">
                  <div className="flex items-center gap-3">
                    <ReceiptText className="size-5 text-accent" aria-hidden="true" />
                    <h2 className="text-xl font-bold">Shopping list</h2>
                  </div>
                  <p className="mt-4 text-2xl font-bold">{formatMoney(shoppingTotal, design.currency)}</p>
                  <p className="mt-2 text-sm leading-6 text-text-secondary">
                    Matched from the public Roomly catalog at the time this design was created.
                  </p>
                </LightCard>

                {shoppingItems.map((item) => (
                  <PublicProductCard key={item.designItemId} design={design} item={item} />
                ))}

                <LightCard className="p-5">
                  <div className="flex items-center gap-3">
                    <Palette className="size-5 text-accent" aria-hidden="true" />
                    <h2 className="text-xl font-bold">Palette</h2>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-3">
                    {plan.palette.hexColors.map((color) => (
                      <div key={color} className="flex flex-col items-center gap-1.5">
                        <div
                          className="size-10 rounded-full border border-border-subtle shadow-[0_2px_6px_rgba(26,22,20,0.10)]"
                          style={{ backgroundColor: color }}
                          aria-hidden="true"
                        />
                        <span className="font-mono text-[10px] font-semibold text-text-secondary">{color}</span>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-sm leading-6 text-text-secondary">{plan.palette.rationale}</p>
                </LightCard>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
