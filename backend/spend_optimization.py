from pulp import LpMaximize, LpMinimize, LpProblem, LpVariable, lpSum, LpInteger
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, Dict, Any
import os
from pulp import LpStatus, value
from typing import Optional, Dict, Any, Union

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class SpendOptimization:
    def __init__(self, budget, channelLimits, frozen_channels_data, brand):

        self.budget = budget
        self.bounds_dict = channelLimits
        self.frozen_channels_data = frozen_channels_data
        self.brand = brand

    def run(self):
        print("Current working directory:", os.getcwd())

        file_path = '../public/data/input.xlsx'
        df_Velo = pd.read_excel(file_path, sheet_name='Velo_Curve')
        df_Velo.columns = [x.lower() + '_velo' for x in df_Velo.columns]
        channels_Velo = df_Velo.columns.to_list()[1:]
        df_Grizzly = pd.read_excel(file_path, sheet_name='Grizzly_Curve')
        df_Grizzly.columns = [x.lower() + '_grizzly' for x in df_Grizzly.columns]
        channels_Grizzly = df_Grizzly.columns.to_list()[1:]
        if self.brand == 'all':
            channels = [x for x in channels_Velo] + [x for x in channels_Grizzly]
            df_place_hodler = df_Velo
        elif self.brand == 'velo':
            channels = [x for x in channels_Velo]
            df_place_hodler = df_Velo
        elif self.brand == 'grizzly':
            channels = [x for x in channels_Grizzly]
            df_place_hodler = df_Grizzly
        else:
            raise KeyError('unknown brand')
        # Create the optimization problem
        model = LpProblem("Maximize_Return_All", LpMaximize)
        # Define decision variables for each channel and placement
        vars = {
            c: [LpVariable(f"{c}_{i}", cat=LpInteger, lowBound=0, upBound=1) for i in range(len(df_place_hodler))]
            for c in channels
        }
        # Ensure that one placement is selected for each channel
        for c in channels:
            model += lpSum(vars[c]) <= 1
        # Total spend constraint (ensure total spend does not exceed the available budget)
        total_spend = lpSum(
            vars[c][i] * df_place_hodler.iloc[i, 0]
            for c in channels
            for i in range(len(df_place_hodler))
        )
        model += total_spend <= self.budget  # Total spend must not exceed the available budget
        # Apply constraints for each channel (lower bounds, upper bounds, and frozen spends)
        for c in channels:
            spend_bounds = self.bounds_dict.get(c, {})
            lower_bound = spend_bounds.get("lower")
            upper_bound = spend_bounds.get("upper")
            frozen_spend = self.frozen_channels_data.get(c, None)
            spend_expr = lpSum(vars[c][i] * df_place_hodler.iloc[i, 0] for i in range(len(df_place_hodler)))
            # Apply frozen spend if available
            if frozen_spend not in [None, [], {}, '']:
                model += spend_expr == int(frozen_spend), f"{c}_frozen_spend"
            else:
                # Apply lower bound constraint if it exists
                if lower_bound and lower_bound.isdigit():
                    model += spend_expr >= int(lower_bound), f"{c}_min_spend"

                # Apply upper bound constraint if it exists
                if upper_bound and upper_bound.isdigit():
                    model += spend_expr <= int(upper_bound), f"{c}_max_spend"
        total_return_expr = lpSum(
            vars[c][i] * (
                df_Grizzly[c][i] if "grizzly" in c else df_Velo[c][i]
            )  * i
            for c in channels
            for i in range(len(df_place_hodler))
        )
        model += total_return_expr  # Add the objective function to the model
        # Solve the model
        model.solve()
        channel_spend = {}
        channel_return = {}
        for c in channels:
            spend = 0
            ret = 0
            for i in range(len(df_place_hodler)):
                val = vars[c][i].varValue
                if val is None:
                    continue
                if c.endswith("_velo"):
                    spend += df_Velo.iloc[i, 0] * val
                    ret += df_Velo[f"{c}"][i] * val * df_Velo.iloc[i, 0] 
                elif c.endswith("_grizzly"):
                    spend += df_Grizzly.iloc[i, 0] * val
                    ret += df_Grizzly[f"{c}"][i] * val * df_Grizzly.iloc[i, 0] 
            channel_spend[c] = spend
            channel_return[c] = ret
        total_return = sum(channel_return.values())
        print("spend", channel_spend,
            "return", channel_return,
            "total_return", total_return,
            "budget", self.budget)
        return {
            "spend": channel_spend,
            "return": channel_return,
            "total_return": total_return,
            "budget": self.budget
        }
    
# Define the Pydantic model to accept the budget in the request
class OptimizationRequest(BaseModel):
    channelLimits: Optional[Dict[str, Any]] = None
    budget: Optional[int] = None
    frozen_channels_data: Optional[Dict[str, Any]] = None 
    brand: Optional[Union[int, str]] = None

@app.post("/optimize")
def optimize(input: OptimizationRequest):
    if input.budget is not None:
        opt = SpendOptimization(channelLimits=input.channelLimits ,frozen_channels_data=input.frozen_channels_data, budget=input.budget, brand=input.brand)
    else:
        return {"error": "Please provide a budget"}

    return opt.run()
