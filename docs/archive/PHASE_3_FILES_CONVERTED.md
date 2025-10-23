# Phase 3: Files Converted to Semantic Tokens

## Priority 1: Advertiser Dashboard Components

### ✅ Completed (7/7) - Priority 1 COMPLETE!

**File 1: CampaignManagementDashboard.tsx**
- ✅ Summary stat cards → `bg-card`, `text-foreground`, `border-border`
- ✅ Search icon → `text-muted-foreground/50`
- ✅ Select dropdown → `bg-background`, `border-input`
- ✅ Loading/error states → `text-muted-foreground`, `text-destructive`
- ✅ Empty state → `bg-card`, `text-muted-foreground`

**File 2: CampaignCard.tsx**
- ✅ Status badges → `bg-success/20`, `bg-warning/20`, `bg-destructive/20`
- ✅ Card container → `bg-card`, `border-border`
- ✅ Dropdown menu → `bg-popover`, `text-popover-foreground`
- ✅ Delete action → `text-destructive`
- ✅ Metrics → `text-muted-foreground`, `text-foreground`
- ✅ Footer → `border-border`, `text-muted-foreground`

**File 3: PerformanceAnalyticsDashboard.tsx**
- ✅ Loading/error states → `text-muted-foreground`, `text-destructive`
- ✅ Time range buttons → `bg-primary`, `text-primary-foreground`, `bg-background`
- ✅ Table headers → `bg-muted`, `text-muted-foreground`
- ✅ Table rows → `bg-card`, `hover:bg-muted/50`
- ✅ Metric cards → `bg-card`, `border-border`
- ✅ Trend indicators → `text-success`, `text-destructive`
- ✅ Chart placeholder → `bg-card`, `text-muted-foreground`

**File 4: AdCreativeManager.tsx**
- ✅ Card containers → `bg-card`, `border-border`
- ✅ Headings → `text-foreground`
- ✅ Icon color → `text-primary`
- ✅ Secondary text → `text-muted-foreground`
- ✅ Tertiary text → `text-muted-foreground/70`
- ✅ Remove logo button → `text-destructive`, `hover:bg-destructive/10`
- ✅ Preview area → `bg-muted`, `border-border`
- ✅ Textarea → `border-input`, `bg-background`, `text-foreground`, `focus:ring-primary`
- ✅ Ad preview container → `bg-muted`, `bg-card`
- ✅ Error notification → `bg-destructive/10`, `border-destructive/30`, `text-destructive`
- ✅ Success notification → `bg-success/10`, `border-success/30`, `text-success`

**File 5: CreateCampaignDialog.tsx**
- ✅ Modal container → `bg-card`, `border-border`
- ✅ Header → `text-foreground`, `hover:bg-muted`
- ✅ Error message → `bg-destructive/10`, `border-destructive/30`, `text-destructive`
- ✅ Labels → `text-foreground/80`
- ✅ Help text → `text-muted-foreground/70`
- ✅ Dollar sign → `text-muted-foreground`
- ✅ Textarea → `border-input`, `bg-background`, `text-foreground`, `placeholder:text-muted-foreground/50`
- ✅ Info box → `bg-primary/10`, `border-primary/30`, `text-primary`
- ✅ Actions footer → `border-border`

**File 6: EditCampaignDialog.tsx**
- ✅ Modal container → `bg-card`, `border-border`
- ✅ Header → `text-foreground`, `hover:bg-muted`
- ✅ Error message → `bg-destructive/10`, `border-destructive/30`, `text-destructive`
- ✅ Labels → `text-foreground/80`
- ✅ Dollar sign → `text-muted-foreground`
- ✅ Textarea → `border-input`, `bg-background`, `text-foreground`
- ✅ Actions footer → `border-border`

**File 7: app/dashboard/advertiser/page.tsx**
- ✅ Page header → `text-foreground`, `text-muted-foreground`
- ✅ Quick action cards → `bg-card`, `border-border`, `hover:border-primary/50`
- ✅ Action icons → `bg-primary/10`, `bg-secondary/10`, `bg-success/10`
- ✅ Card text → `text-foreground`, `text-muted-foreground`
- ✅ Account status (verified) → `bg-success/10`, `border-success/30`, `text-success`
- ✅ Account status (pending) → `bg-warning/10`, `border-warning/30`, `text-warning`
- ✅ Account status (unverified) → `bg-primary/10`, `border-primary/30`, `text-primary`
- ✅ Booking cards → `bg-card`, `bg-muted`, `border-border`
- ✅ Status badges → `bg-success/20`, `bg-destructive/20`, `bg-primary/20` with borders
- ✅ Booking details → `text-muted-foreground`, icons at `/50`
- ✅ Warning text → `text-warning`
- ✅ Preview section → `bg-card`, `bg-muted`, `border-border`

## Conversion Pattern

### Common Replacements Applied:

| Hardcoded | Semantic Token | Usage |
|-----------|----------------|-------|
| `bg-white dark:bg-gray-800` | `bg-card` | Card backgrounds |
| `bg-gray-50` | `bg-muted` | Table headers, subtle backgrounds |
| `text-gray-900 dark:text-gray-100` | `text-foreground` | Primary text |
| `text-gray-600 dark:text-gray-400` | `text-muted-foreground` | Secondary text |
| `text-gray-500` | `text-muted-foreground/70` | Tertiary text |
| `border-gray-200 dark:border-gray-700` | `border-border` | All borders |
| `bg-green-100 text-green-800` | `bg-success/20 text-success` | Success states |
| `bg-yellow-100 text-yellow-800` | `bg-warning/20 text-warning` | Warning states |
| `bg-red-100 text-red-800` | `bg-destructive/20 text-destructive` | Error/destructive states |
| `bg-blue-600` | `bg-primary` | Primary actions |
| `text-blue-600` | `text-primary` | Primary links |
| `hover:bg-gray-50 dark:hover:bg-gray-700` | `hover:bg-muted` | Hover states |
| `hover:bg-gray-100` | `hover:bg-muted/50` | Light hover states |

### Benefits Achieved:

✅ **Eliminated all `dark:` variants** - Automatic dark mode support
✅ **Single source of truth** - Colors defined in globals.css
✅ **Consistent palette** - All components use same color system
✅ **Maintainable** - Change once, updates everywhere
✅ **Accessible** - Proper contrast ratios maintained

## ✅ Priority 2: User-Facing Components COMPLETE! (13/13 - 100%)

**File 1: app/advertise/page.tsx** ✅
- ✅ Preview button → `bg-card`
- ✅ How It Works cards → `bg-card`
- ✅ Federal pricing card → `bg-card`, badge `from-primary`
- ✅ Federal savings → `text-success`
- ✅ Federal checkmarks → `text-success`
- ✅ State pricing card → `bg-card`, `border-success`, badge `from-success`
- ✅ State icon → `text-success`
- ✅ State savings → `text-success`
- ✅ State checkmarks → `text-success`
- ✅ State CTA → `bg-success`, `hover:bg-success/90`
- ✅ Volume discount checks → `text-success`
- ✅ Value prop cards → `bg-card`
- ✅ Availability warning → `bg-warning/10`, `border-warning/30`, `bg-warning/20`, `text-warning`
- ✅ Status dots → `bg-success`, `bg-warning`, `bg-destructive`
- ✅ Trust cards → `bg-card`
- ✅ FAQ items → `bg-card`
- ✅ Final CTA button → `bg-card`

**File 2: app/advertise/onboarding/page.tsx** ✅
- ✅ Success checkmark → `bg-success/10`, `text-success`
- ✅ Error message → `bg-destructive/10`, `border-destructive/30`, `text-destructive`

**File 3: components/judges/JudgeProfile.tsx** ✅
- ✅ Metric card icons (Total cases) → `text-primary`, `bg-primary/10`
- ✅ Metric card icons (Reversal rate) → `text-secondary`, `bg-secondary/10`
- ✅ Metric card icons (Decision time) → `text-success`, `bg-success/10`

**File 4: components/judges/EnhancedJudgeSearch.tsx** ✅
- ✅ Experience color scale → `text-secondary`/`text-primary`/`text-success`/`text-warning`
- ✅ Efficiency color scale → `text-success`/`text-warning`/`text-destructive`
- ✅ Settlement color scale → `text-success`/`text-warning`/`text-destructive`
- ✅ Error message → `bg-destructive/10`, `border-destructive/30`, `text-destructive`
- ✅ Loading skeleton → `border-border`

**File 5: components/chat/AILegalAssistant.tsx** ✅
- ✅ Already using semantic tokens - no changes needed

**File 6: components/courts/CourtsSearch.tsx** ✅
- ✅ Federal court icons → `text-primary`, `bg-primary/10`
- ✅ State court icons → `text-secondary`, `bg-secondary/10`
- ✅ County court icons → `text-success`, `bg-success/10`

**File 7: components/courts/CourtAdvertiserSlots.tsx** ✅
- ✅ Advertiser badge → `bg-primary/10`, `text-primary`
- ✅ Website link hover → `text-primary/80`
- ✅ CTA button → `bg-primary`, `text-primary-foreground`, `hover:bg-primary/90`

**File 8: components/courts/CourtJudgesSection.tsx** ✅
- ✅ Already using semantic tokens - no changes needed

**File 9: components/home/sections/LiveInsightsSection.tsx** ✅
- ✅ Converted (minimal hardcoded colors)

**File 10: components/seo/HomepageFAQ.tsx** ✅
- ✅ Converted (minimal hardcoded colors)

**File 11: components/ui/AIUnifiedSearch.tsx** ✅
- ✅ Converted (minimal hardcoded colors)

**File 12: components/ui/CountyComparison.tsx** ✅
- ✅ Converted (minimal hardcoded colors)

**File 13: components/search/SponsoredTile.tsx** ✅
- ✅ All yellow colors → `warning` tokens
- ✅ Border → `border-warning/40`
- ✅ Background → `bg-warning/10`, `bg-warning/20`
- ✅ Text → `text-warning-*` variants

## ✅ Priority 1 Complete!

All 7 Advertiser Dashboard component files have been successfully converted to semantic design tokens.

**Progress**:
- Priority 1: 7/7 files (100%) ✅
- Priority 2: 13/13 files (100%) ✅

**Total Files Converted**: 20/50 (40% overall)
**Time Taken**: ~2 hours

## Next Steps: Priority 3 & 4

**Priority 3**: Internal Dashboard Components (20 files) - Medium impact
**Priority 4**: Utility/Error Components (10 files) - Low impact

**Total Remaining**: 30/50 files (60%)
**Estimated Time Remaining**: ~2-3 hours
