-- ========================================
-- MIGRATION: Ad Orders Table
-- Version: 20251013_001
-- Purpose: Store completed ad space purchases from Stripe
-- Author: JudgeFinder Platform Team
-- Date: 2025-10-13
-- ========================================

-- Create ad_orders table to track successful purchases
CREATE TABLE IF NOT EXISTS public.ad_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,

  -- Stripe identifiers
  stripe_session_id TEXT UNIQUE NOT NULL,
  stripe_payment_intent TEXT,
  stripe_customer TEXT,

  -- Customer information
  organization_name TEXT NOT NULL,
  customer_email TEXT NOT NULL,

  -- Order details
  ad_type TEXT NOT NULL CHECK (ad_type IN ('judge-profile', 'court-listing', 'featured-spot')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'fulfilled', 'refunded', 'canceled')),

  -- Payment details
  amount_total INTEGER NOT NULL, -- in cents
  currency TEXT NOT NULL DEFAULT 'usd',
  payment_status TEXT,

  -- Metadata
  client_ip TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,

  -- Fulfillment tracking
  fulfilled_at TIMESTAMP WITH TIME ZONE,
  fulfilled_by UUID REFERENCES auth.users(id),

  -- Audit
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Add indexes for common queries
CREATE INDEX IF NOT EXISTS idx_ad_orders_stripe_session ON public.ad_orders(stripe_session_id);
CREATE INDEX IF NOT EXISTS idx_ad_orders_email ON public.ad_orders(customer_email);
CREATE INDEX IF NOT EXISTS idx_ad_orders_status ON public.ad_orders(status);
CREATE INDEX IF NOT EXISTS idx_ad_orders_created_at ON public.ad_orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ad_orders_ad_type ON public.ad_orders(ad_type);

-- Add comments
COMMENT ON TABLE public.ad_orders IS 'Completed ad space purchases from Stripe checkout sessions';
COMMENT ON COLUMN public.ad_orders.stripe_session_id IS 'Stripe checkout session ID';
COMMENT ON COLUMN public.ad_orders.stripe_payment_intent IS 'Stripe payment intent ID';
COMMENT ON COLUMN public.ad_orders.ad_type IS 'Type of ad placement: judge-profile, court-listing, or featured-spot';
COMMENT ON COLUMN public.ad_orders.amount_total IS 'Total amount paid in cents (e.g., 10000 = $100.00)';
COMMENT ON COLUMN public.ad_orders.status IS 'Order status: pending, paid, fulfilled, refunded, canceled';

-- Enable Row Level Security
ALTER TABLE public.ad_orders ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Service role can do anything
CREATE POLICY "Service role has full access to ad_orders"
  ON public.ad_orders
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS Policy: Authenticated admin users can view all orders
CREATE POLICY "Admins can view all ad orders"
  ON public.ad_orders
  FOR SELECT
  TO authenticated
  USING (
    -- Check if user is admin (customize based on your admin check)
    EXISTS (
      SELECT 1 FROM auth.users
      WHERE id = auth.uid()
      AND raw_user_meta_data->>'role' = 'admin'
    )
  );

-- RLS Policy: Users can view their own orders by email
CREATE POLICY "Users can view their own ad orders"
  ON public.ad_orders
  FOR SELECT
  TO authenticated
  USING (
    customer_email = (
      SELECT email FROM auth.users WHERE id = auth.uid()
    )
  );

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_ad_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_ad_orders_updated_at
  BEFORE UPDATE ON public.ad_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_ad_orders_updated_at();

-- Grant permissions
GRANT SELECT ON public.ad_orders TO authenticated;
GRANT ALL ON public.ad_orders TO service_role;

-- Update statistics
ANALYZE public.ad_orders;
