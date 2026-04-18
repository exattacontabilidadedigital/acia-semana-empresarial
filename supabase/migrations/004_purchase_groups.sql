-- Add purchase_group column to inscriptions for multi-event cart checkout
ALTER TABLE public.inscriptions ADD COLUMN purchase_group text;
CREATE INDEX idx_inscriptions_purchase_group ON public.inscriptions(purchase_group);
