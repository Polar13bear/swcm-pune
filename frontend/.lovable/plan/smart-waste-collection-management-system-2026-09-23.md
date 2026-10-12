# Smart Waste Collection Management System

## Goal
Build a polished, frontend-only municipal operations platform with realistic Indian fleet data, live simulation, interactive maps, charts, filters, and complete navigation across all requested operational areas.

## What will be built
- A responsive enterprise shell with collapsible desktop sidebar, compact tablet navigation, mobile drawer/bottom access, global search, live status, time, notifications, corporation selector, and admin profile.
- Dashboard overview with six KPI cards, live fleet map, route/zone context, operational charts, alerts, and clear links into vehicle tracking and optimization.
- Dedicated pages for Live Vehicle Tracking, Vehicles, Vehicle Details, AI Route Optimization, Collection Zones, Waste Monitoring, Cost & Fuel, Analytics & Reports, Alerts, Drivers, and Settings.
- Reusable tables with working search, sorting, filters, pagination, export actions, empty states, and row-level navigation.
- Interactive mock maps with status-coded vehicles, route lines, zones, depots, transfer stations, controls, marker popovers, and simulated movement without requiring an API key.
- Realistic charts with tooltips, legends, units, and populated 30-day Indian municipal operating data.
- Simulated route optimization with loading feedback, before/after map comparison, and distance, fuel, time, and rupee savings.
- Interactive alert acknowledgement/resolution, notification panel, and vehicle detail drill-down.

## Data and behavior
- Generate structured mock datasets for 100+ vehicles, 50 drivers, 10 zones, 30 routes, 30 days of waste/cost/fuel history, and 20+ alerts.
- Keep data definitions separate from views so a REST API can replace them later.
- Run lightweight client-side updates every few seconds for location, speed, fuel, load, status, and “last updated” labels.
- Use deterministic seed-based data so the demo remains realistic and stable across reloads.

## Visual direction
- Municipal command-center aesthetic: warm white and light gray surfaces, dark charcoal/navy text, environmental green primary, blue information, amber warning, and red critical states.
- Compact, data-dense layouts with restrained shadows, modest corner radii, strong hierarchy, crisp charts, and minimal motion.
- No marketing-page styling, decorative gradients, oversized type, or cartoon imagery.

## Technical approach
- Keep the existing TanStack Start routing foundation and create one typed route per page; all leaf routes receive unique metadata.
- Use React, TypeScript, Tailwind v4 tokens, Lucide icons, existing Radix/shadcn primitives, and Recharts.
- Build the map as a responsive, realistic vector street-grid interface with clickable HTML/SVG overlays, avoiding external map keys and SSR-only map-library risks.
- Organize common UI into layout, map, chart, table, status, filter, alert, and statistic components.

## Validation
- Check the main workflow end to end: dashboard → tracking → vehicle details → route optimization → savings.
- Verify navigation, filters, sorting, pagination, popovers, exports, optimization, alerts, and responsive behavior.
- Inspect desktop and mobile views and confirm no clipping, overlap, blank charts, broken actions, runtime errors, or console errors.
