from pulp import LpMaximize, LpMinimize, LpProblem, LpVariable, lpSum, LpInteger
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional


app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class SpendOptimization:
    def __init__(self, budget, target_return, method='return_optimization'):

        self.budget = budget
        self.target_return = target_return
        self.method = method

    def run(self):
        spend_options = [0, 100, 200, 300, 400, 500]
        df = pd.DataFrame({
            "Spend": spend_options,
            "MROI_A": [0, 2.5, 2.0, 1.8, 1.5, 1.2],
            "MROI_B": [0, 1.5, 1.8, 2.0, 2.2, 2.5],
            "MROI_C": [0, 2.2, 1.9, 1.6, 1.3, 1.1]
        })

        channels = [col for col in df.columns if col.startswith("MROI_")]
        returns = {}
        for ch in channels:
            cumulative = (df[ch] * df["Spend"]).cumsum()
            returns[ch] = dict(zip(df["Spend"], cumulative))

        df = df.merge(pd.DataFrame(returns).reset_index(names='Spend'), on='Spend', suffixes=('', '_cumulative'))


        if self.method == 'return_optimization':

            model = LpProblem("Maximize_Return", LpMaximize)
            vars_A = [LpVariable(f"A_{i}", cat=LpInteger, lowBound=0, upBound=1) for i in spend_options]
            vars_B = [LpVariable(f"B_{i}", cat=LpInteger, lowBound=0, upBound=1) for i in spend_options]
            vars_C = [LpVariable(f"C_{i}", cat=LpInteger, lowBound=0, upBound=1) for i in spend_options]

            model += lpSum(vars_A) == 1
            model += lpSum(vars_B) == 1
            model += lpSum(vars_C) == 1

            total_spend = (
                lpSum([vars_A[i] * spend_options[i] for i in range(len(spend_options))]) +
                lpSum([vars_B[i] * spend_options[i] for i in range(len(spend_options))]) +
                lpSum([vars_C[i] * spend_options[i] for i in range(len(spend_options))])
            )
            model += total_spend <= self.budget

            return_A = lpSum([vars_A[i] * df["MROI_A_cumulative"][i] for i in range(len(spend_options))])
            return_B = lpSum([vars_B[i] * df["MROI_B_cumulative"][i] for i in range(len(spend_options))])
            return_C = lpSum([vars_C[i] * df["MROI_C_cumulative"][i] for i in range(len(spend_options))])
            model += return_A + return_B + return_C

            model.solve()

            spend_A = sum(spend_options[i] * vars_A[i].varValue for i in range(len(spend_options)))
            spend_B = sum(spend_options[i] * vars_B[i].varValue for i in range(len(spend_options)))
            spend_C = sum(spend_options[i] * vars_C[i].varValue for i in range(len(spend_options)))
            total_return = sum(
                df["MROI_A_cumulative"][i] * vars_A[i].varValue +
                df["MROI_B_cumulative"][i] * vars_B[i].varValue +
                df["MROI_C_cumulative"][i] * vars_C[i].varValue
                for i in range(len(spend_options))
            )

            return {
                "spend_A": spend_A,
                "spend_B": spend_B,
                "spend_C": spend_C,
                "total_return": total_return,
                "return_A": sum(df["MROI_A_cumulative"][i] * vars_A[i].varValue for i in range(len(spend_options))),
                "return_B": sum(df["MROI_B_cumulative"][i] * vars_B[i].varValue for i in range(len(spend_options))),
                "return_C": sum(df["MROI_C_cumulative"][i] * vars_C[i].varValue for i in range(len(spend_options))),
                "budget": self.budget
            }
        elif self.method == 'min_budget_for_NBRx':

            model = LpProblem("Minimize_Budget", LpMinimize)

            vars_A = [LpVariable(f"A_{i}", cat=LpInteger, lowBound=0, upBound=1) for i in spend_options]
            vars_B = [LpVariable(f"B_{i}", cat=LpInteger, lowBound=0, upBound=1) for i in spend_options]
            vars_C = [LpVariable(f"C_{i}", cat=LpInteger, lowBound=0, upBound=1) for i in spend_options]

            model += lpSum(vars_A) == 1
            model += lpSum(vars_B) == 1
            model += lpSum(vars_C) == 1

            total_spend = (
                lpSum([vars_A[i] * spend_options[i] for i in range(len(spend_options))]) +
                lpSum([vars_B[i] * spend_options[i] for i in range(len(spend_options))]) +
                lpSum([vars_C[i] * spend_options[i] for i in range(len(spend_options))])
            )
            model += total_spend  # Objective: minimize this

            return_A = lpSum([vars_A[i] * df["MROI_A_cumulative"][i] for i in range(len(spend_options))])
            return_B = lpSum([vars_B[i] * df["MROI_B_cumulative"][i] for i in range(len(spend_options))])
            return_C = lpSum([vars_C[i] * df["MROI_C_cumulative"][i] for i in range(len(spend_options))])
            total_return = return_A + return_B + return_C

            model += total_return >= self.target_return

            model.solve()

            spend_A = sum(spend_options[i] * vars_A[i].varValue for i in range(len(spend_options)))
            spend_B = sum(spend_options[i] * vars_B[i].varValue for i in range(len(spend_options)))
            spend_C = sum(spend_options[i] * vars_C[i].varValue for i in range(len(spend_options)))
            final_return = sum(
                df["MROI_A_cumulative"][i] * vars_A[i].varValue +
                df["MROI_B_cumulative"][i] * vars_B[i].varValue +
                df["MROI_C_cumulative"][i] * vars_C[i].varValue
                for i in range(len(spend_options))
            )

            return {
                "spend_A": spend_A,
                "spend_B": spend_B,
                "spend_C": spend_C,
                "total_return": final_return,
                "return_A": sum(df["MROI_A_cumulative"][i] * vars_A[i].varValue for i in range(len(spend_options))),
                "return_B": sum(df["MROI_B_cumulative"][i] * vars_B[i].varValue for i in range(len(spend_options))),
                "return_C": sum(df["MROI_C_cumulative"][i] * vars_C[i].varValue for i in range(len(spend_options))),
                "budget": spend_A + spend_B + spend_C
            }
        
# Define the Pydantic model to accept the budget in the request
class OptimizationRequest(BaseModel):
    budget: Optional[int] = None
    target_return: Optional[int] = None

@app.post("/optimize")
def optimize(input: OptimizationRequest):
    if input.budget is not None:
        opt = SpendOptimization(budget=input.budget, target_return=0, method='return_optimization')
    elif input.target_return is not None:
        opt = SpendOptimization(budget=999999, target_return=input.target_return, method='min_budget_for_NBRx')
    else:
        return {"error": "Please provide either a budget or a target return."}

    return opt.run()
