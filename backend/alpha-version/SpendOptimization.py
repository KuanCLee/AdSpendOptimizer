from scipy.optimize import minimize
import pandas as pd
import numpy as np
import os


class SpendOptimization:
    """
    Optimizes spend allocation across brands, media medias, and time periods
    based on budget constraints and response curve parameters.
    
    Parameters:
    ----------
    budget : float or int
        Total budget available for spend optimization.

    media_limits : dict
        Dictionary specifying lower and upper bounds for each brand/media/period combination.
        Example:
            {
                'izervay': {
                            'pde': {
                                    1: {'lower bound': 30, 'upper bound': 116},
                                    2: {'lower bound': 50, 'upper bound': 116}
                            }
                },
                'grizzly': {
                            'pde': {
                                    1: {'lower bound': 0, 'upper bound': 12},
                                    2: {'lower bound': 150, 'upper bound': 200}}
                            }
                }
    
    media_limits_per : dict
        Dictionary specifying lower and upper bounds for each brand/media/period combination, 
        based on percentage change from last year's spending.        
        Example:
            {
                'izervay': {
                            'pde': {
                                    1: 0.5,
                                    2: 0.2
                            }
                },
                'grizzly': {
                            'pde': {
                                    1:1,
                                    2:2.5
                            }
                }

    locked_media_allocations : dict
        Dictionary of medias that should remain fixed (not optimized).
        Example:
            {
                'izervay': {
                    'pde': {1: 200.0, 2: 300.0},
                    'dtc ctv': {1: 200.0, 2: 200.0}
                },
                'grizzly': {
                    'pde': {1: 0.0, 2: 50.0}
                }
            }
            
    brand : str
        Brand name for which to run optimization. Can be one of:
        'all', 'grizzly', 'izervay'..etc.

    """

    def __init__(
        self,
        budget,
        media_budget_limits,
        media_budget_limits_pct,
        locked_media_allocations,
        brand,
        brand_budget_constraints
    ):
        self.budget = budget
        self.media_budget_limits = media_budget_limits
        self.media_budget_limits_pct = media_budget_limits_pct
        self.locked_media_allocations = locked_media_allocations
        self.brand = brand.lower()
        self.brand_budget_constraints = brand_budget_constraints

    def run(self):
        if self.media_budget_limits and self.media_budget_limits_pct:
            raise ValueError("Only one limit set is allowed. " \
            "Please specify either fixed limits or percentage limits , not both.")
        print("Current working directory:", os.getcwd())
        file_path = os.path.join(os.getcwd(),'Optimization_document.xlsx')
        base = pd.read_excel(file_path, sheet_name='Base')
        curve_df = pd.read_excel(file_path, sheet_name='Response Curve parameters')
        brand_map = {'veozah': 'veozah', 'grizzly': 'grizzly', 'izervay': 'izervay','xtandi':'xtandi'}
        
        # checking constraints 
        self.validate_bounds(file_path=file_path)

        # brand level 
        if self.brand == 'all':
            filtered_curve_df = curve_df
            filtered_base = base
        elif self.brand in brand_map:
            filtered_curve_df = curve_df[curve_df['Brand'].str.lower() == brand_map[self.brand]]
            filtered_base = base[base['Brand'].str.lower() == brand_map[self.brand]]
        else:
            raise KeyError(f'Unknown brand: {self.brand}')
        
        filtered_base['Brand'] = filtered_base['Brand'].str.lower()
        filtered_curve_df['Brand'] = filtered_curve_df['Brand'].str.lower()
        filtered_curve_df['media type'] = filtered_curve_df['media type'].str.lower()

        brands = filtered_base['Brand'].unique()
        medias = filtered_curve_df['media type'].unique()
        periods = filtered_base['Period'].unique()

        brand_idx = {b: i for i, b in enumerate(brands)}
        media_idx = {m: i for i, m in enumerate(medias)}
        period_idx = {t: i for i, t in enumerate(periods)}

        curve_dict = {
            (row['Brand'], row['media type']): {'alpha': row['alpha'], 'beta': row['Beta']}
            for _, row in filtered_curve_df.iterrows()
        }
        base_lookup = {
            (row['Brand'], row['Period']): row['Base']
            for _, row in filtered_base.iterrows()
        }
        price_lookup = {
            (row['Brand'], row['Period']): row['Price']
            for _, row in filtered_base.iterrows()
        }
        
        # Assign unique identifier to create decision variables
        B, M, T = len(brands), len(medias), len(periods)
        n_vars = B * M * T

        def idx(b, m, t):
            return brand_idx[b] * (M * T) + media_idx[m] * T + period_idx[t]

        def objective(x):
            total = 0
            for b in brands:
                for m in medias:
                    for t in periods:
                        i = idx(b, m, t)
                        val = x[i]
                        params = curve_dict.get((b, m))
                        if params is None:
                            continue
                        base_val = base_lookup.get((b, t), 0)
                        price = price_lookup.get((b, t), 0)
                        beta = params.get('beta', 1)
                        alpha = params.get('alpha', 0)
                        if val > 0:
                            total += alpha * (val ** beta) * base_val * price
                        else:
                            total += 0                       
            return -total

        # Setup constraints
        constraints = []

        # Total budget constraint: total spend ≤ budget
        total_budget = self.budget
        constraints.append({
            'type': 'ineq',
            'fun': lambda x: total_budget - np.sum(x)
        })

        # Initialize bounds as usual
        bounds = [(0, None)] * n_vars

        if self.brand_budget_constraints:
            for brand in brands:
                indices = [idx(brand, m, t) for m in medias for t in periods]

                if brand in self.brand_budget_constraints:
                    low = self.brand_budget_constraints[brand].get('lower bound', 0)
                    high = self.brand_budget_constraints[brand].get('upper bound', self.budget)

                    # If brand upper bound is 0, fix all related variables to 0
                    if high == 0:
                        for i in indices:
                            bounds[i] = (0, 0)
                    else:
                        pass

                    # Add brand sum constraints
                    constraints.append({
                        'type': 'ineq',
                        'fun': lambda x, i=indices, h=high: h - sum(x[j] for j in i)
                    })
                    constraints.append({
                        'type': 'ineq',
                        'fun': lambda x, i=indices, l=low: sum(x[j] for j in i) - l
                    })

        # Add per-brand-media-period constraints/bound
        if self.media_budget_limits not in [None, [], {}, '']:
            for brand in brands:
                for media in medias:
                    for period in periods:
                        period_int = int(period)
                        # Defaults
                        lower = 0
                        upper = None

                        # If bounds are explicitly specified
                        if (
                            brand in self.media_budget_limits
                            and media in self.media_budget_limits[brand]
                            and period_int in self.media_budget_limits[brand][media]
                        ):
                            bounds_info = self.media_budget_limits[brand][media][period_int]
                            lower = bounds_info.get('lower bound', 0)
                            upper = bounds_info.get('upper bound', None)
                            # Get index for this variable
                            i = idx(brand, media, period)
                            if i >= len(bounds):
                                raise IndexError(f"Index {i} out of bounds for bounds of length {len(bounds)}")

                            # Update the bounds at position i
                            bounds[i] = (lower, upper)
                
        if self.media_budget_limits_pct not in [None, [], {}, '']:
            prior_year_df = pd.read_excel(file_path, sheet_name='Media Spending in prior year')
            prior_year_lookup = {
                (row['Brand'].lower(), row['media'].lower(), int(row['period'])): row['spending']
                for _, row in prior_year_df.iterrows()
            }
            for brand in brands:
                for media in medias:
                    for period in periods:
                        period_int = int(period)
                        # Default bounds
                        lower = 0
                        upper = None

                        if (
                            brand in self.media_budget_limits_pct
                            and media in self.media_budget_limits_pct[brand]
                            and period_int in self.media_budget_limits_pct[brand][media]
                        ):
                            percent_bound = self.media_budget_limits_pct[brand][media][period_int]
                            prior_year_spending = prior_year_lookup.get((brand, media, period_int), 0)
                            lower = prior_year_spending * (1 - percent_bound)
                            upper = prior_year_spending * (1 + percent_bound)

                            # Get index for this variable
                            i = idx(brand, media, period)
                            if i >= len(bounds):
                                raise IndexError(f"Index {i} out of bounds for bounds of length {len(bounds)}")

                            # Update the bounds at position i
                            bounds[i] = (lower, upper)
                
        # Add freezing constraints/bound
        if self.locked_media_allocations not in [None, [], {}, '']:
            for brand in brands:
                for media in medias:
                    for period in periods:
                        period_int = int(period)

                        if (
                            brand in self.locked_media_allocations
                            and media in self.locked_media_allocations[brand]
                            and period_int in self.locked_media_allocations[brand][media]
                        ):
                            fixed_val = self.locked_media_allocations[brand][media][period_int]
                            i = idx(brand, media, period)

                            # Overwrite the bounds to fix the variable
                            bounds[i] = (fixed_val, fixed_val)

        if bounds not in [None, [], {}, '']:
            total_lower = 0
            for lower, upper in bounds:
                total_lower += lower if lower is not None else 0
                if total_lower > total_budget:
                    return 'over'
        else:
            bounds = [(0,  None)] * n_vars
       # print(bounds)

        x0 = []
        default_guess = self.budget / n_vars / 2  # overall fair share fallback

        for i, (lower, upper) in enumerate(bounds):
            # Safe defaults
            lo = lower if lower is not None else 0
            hi = upper if upper is not None else default_guess * 2  # fallback upper

            # Start with fair guess, clipped within bounds
            guess = min(default_guess, hi)
            guess = max(guess, lo)

            x0.append(guess)

        x0 = np.array(x0)
       # print(x0)

        result = minimize(
            objective, x0,
            bounds=bounds,
            constraints=constraints,
            method='SLSQP',
            options={'disp': True, 'maxiter': 5000}
        )

        # Output
        output = {}
        for b in brands:
            output[b] = {}
            for m in medias:
                output[b][m] = {}
                for t in periods:
                    i = idx(b, m, t)
                    val = result.x[i]
                    params = curve_dict.get((b, m), {'alpha': 0, 'beta': 0})
                    base_val = base_lookup.get((b, t), 0)
                    price = price_lookup.get((b, t), 0)
                    ret = params['alpha'] * (val ** params['beta']) * base_val * price if base_val > 0 else 0
                    output[b][m][t] = {
                        'optimal_spending': val,
                        'incremental_dollar': ret
                    }

        total_return = -result.fun

        # If optimization failed, assess closeness to budget
        if not result.success:
            total_optimal_spending = 0
            for brand_data in output.values():
                for media_data in brand_data.values():  # e.g., 'pde', 'mab', etc.
                    for time_data in media_data.values():  # e.g., 1, 2, 3...
                        total_optimal_spending += time_data.get('optimal_spending', 0)
            print(total_optimal_spending)
            if abs(total_optimal_spending - self.budget) <= 5:
                print("⚠️ Optimization couldn't fully satisfy all constraints, but since the result is within $5 of the budget, we're treating it as a near-feasible solution.")
            else:
                print("❌ Optimization failed!")
                print("Reason:", result.message)
                print(result)
        
        return {
            "output": output,
            "total_return": total_return
        }

    def validate_bounds(self, file_path=None):

        total_media_lower_bound = 0
        total_brand_lower_bound = 0
        total_frozen_spend = 0

        # 1. Validate brand-level bounds
        if self.brand_budget_constraints:
            for brand, bounds in self.brand_budget_constraints.items():
                lb = bounds.get('lower bound', 0)
                ub = bounds.get('upper bound', float('inf'))

                if lb > ub:
                    raise ValueError(
                        f"Brand '{brand}': lower bound ({lb}) is greater than upper bound ({ub})."
                    )

                total_brand_lower_bound += lb

            if total_brand_lower_bound > self.budget:
                raise ValueError(
                    f"Sum of brand-level lower bounds ({total_brand_lower_bound}) "
                    f"exceeds total budget ({self.budget})."
                )

        # 2. Validate media-level bounds
        if self.media_budget_limits:
            for brand, media_dict in self.media_budget_limits.items():
                brand_media_lb = 0

                for media, period_dict in media_dict.items():
                    for period, bounds in period_dict.items():
                        lb = bounds.get('lower bound', 0)
                        ub = bounds.get('upper bound', float('inf'))

                        if lb > ub:
                            raise ValueError(
                                f"Brand '{brand}', media '{media}', period {period}: "
                                f"lower bound ({lb}) is greater than upper bound ({ub})."
                            )

                        brand_media_lb += lb

                if self.brand_budget_constraints and brand in self.brand_budget_constraints:
                    brand_ub = self.brand_budget_constraints[brand].get('upper bound', float('inf'))
                    if brand_media_lb > brand_ub:
                        raise ValueError(
                            f"Sum of media-level lower bounds ({brand_media_lb}) for brand '{brand}' "
                            f"exceeds brand-level upper bound ({brand_ub})."
                        )
                        
                total_media_lower_bound += brand_media_lb

            if total_media_lower_bound > self.budget:
                raise ValueError(
                    f"Total sum of media-level lower bounds across all brands ({total_media_lower_bound}) "
                    f"exceeds total budget ({self.budget})."
                )

        # 3. Validate frozen media spend
        if self.locked_media_allocations:
            for brand, media_dict in self.locked_media_allocations.items():
                brand_frozen_total = 0
                for media, period_dict in media_dict.items():
                    for period, spend in period_dict.items():
                        total_frozen_spend += spend
                        brand_frozen_total += spend

                if self.brand_budget_constraints and brand in self.brand_budget_constraints:
                    brand_bounds = self.brand_budget_constraints[brand]
                    lb = brand_bounds.get('lower bound', 0)
                    ub = brand_bounds.get('upper bound', float('inf'))

                    if not (lb <= brand_frozen_total <= ub):
                        raise ValueError(
                            f"Frozen media spend for brand '{brand}' = {brand_frozen_total} "
                            f"is outside brand-level bounds ({lb}, {ub})."
                        )

            if total_frozen_spend > self.budget:
                raise ValueError(
                    f"Total frozen media spend across all brands ({total_frozen_spend}) "
                    f"exceeds total budget ({self.budget})."
                )

        # 4. Validate media_input_percentage-derived lower bounds
        if self.media_budget_limits_pct:
            prior_year_df = pd.read_excel(file_path, sheet_name='Media Spending in prior year')
            prior_year_lookup = {
                (row['Brand'].lower(), row['media'].lower(), int(row['period'])): row['spending']
                for _, row in prior_year_df.iterrows()
            }
            
            total_lower_bound = 0
            for brand, media_dict in self.media_budget_limits_pct.items():
                brand_lower_bound = 0

                for media, period_dict in media_dict.items():
                    for period, ratio in period_dict.items():
                        key = (brand.lower(), media.lower(), int(period))
                        prior_spend = prior_year_lookup.get(key, 0)

                        # Get percentage bound from config
                        percent_bound = 0
                        if (
                            brand in self.media_budget_limits_pct and
                            media in self.media_budget_limits_pct[brand] and
                            int(period) in self.media_budget_limits_pct[brand][media]
                        ):
                            percent_bound = self.media_budget_limits_pct[brand][media][int(period)]

                        # Calculate lower bound as prior × (1 - %)
                        lower = prior_spend * (1 - percent_bound)

                        brand_lower_bound += lower
                        total_lower_bound += lower

                # Check if brand lower bound exceeds brand upper bound
                if self.brand_budget_constraints and brand in self.brand_budget_constraints:
                    brand_ub = self.brand_budget_constraints[brand].get('upper bound', float('inf'))
                    if brand_lower_bound > brand_ub:
                        raise ValueError(
                            f"Brand '{brand}': sum of media-level lower bounds from media_input_percentage "
                            f"({brand_lower_bound:.2f}) exceeds brand upper bound ({brand_ub})."
                        )

            # Check if total media-level lower bound exceeds total budget
            if total_lower_bound > self.budget:
                raise ValueError(
                    f"Sum of all media-level lower bounds from media_input_percentage ({total_lower_bound:.2f}) "
                    f"exceeds total budget ({self.budget})."
                )
