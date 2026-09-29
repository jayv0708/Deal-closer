from decimal import Decimal, ROUND_HALF_UP
from typing import Dict, Any

def calculate_emi(principal: float, annual_interest_rate: float, tenure_years: int) -> Dict[str, Any]:
    """
    Calculate Equated Monthly Installment (EMI).
    """
    if principal <= 0 or tenure_years <= 0:
        return {"error": "Principal and tenure must be positive"}
        
    if annual_interest_rate <= 0:
        # 0% interest case
        monthly_emi = principal / (tenure_years * 12)
        total_payment = principal
        total_interest = 0
    else:
        monthly_rate = annual_interest_rate / (12 * 100)
        num_months = tenure_years * 12
        
        # EMI formula: P * r * (1 + r)^n / ((1 + r)^n - 1)
        monthly_emi = principal * monthly_rate * ((1 + monthly_rate) ** num_months) / (((1 + monthly_rate) ** num_months) - 1)
        total_payment = monthly_emi * num_months
        total_interest = total_payment - principal

    # Formatting outputs using Decimal for financial precision
    def format_money(val: float) -> float:
        return float(Decimal(str(val)).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))

    return {
        "monthly_emi": format_money(monthly_emi),
        "total_payment": format_money(total_payment),
        "total_interest": format_money(total_interest),
        "assumptions": {
            "principal": principal,
            "annual_rate": annual_interest_rate,
            "tenure_years": tenure_years
        }
    }

def calculate_down_payment(property_value: float, down_payment_percentage: float = 20.0) -> Dict[str, Any]:
    """
    Calculate the down payment required based on a percentage.
    """
    if property_value <= 0 or down_payment_percentage < 0 or down_payment_percentage > 100:
        return {"error": "Invalid property value or percentage"}
        
    down_payment = property_value * (down_payment_percentage / 100)
    loan_amount = property_value - down_payment
    
    return {
        "property_value": property_value,
        "down_payment_percentage": down_payment_percentage,
        "down_payment_amount": float(Decimal(str(down_payment)).quantize(Decimal('0.01'))),
        "loan_amount": float(Decimal(str(loan_amount)).quantize(Decimal('0.01')))
    }

def calculate_rental_yield(monthly_rent: float, property_value: float) -> Dict[str, Any]:
    """
    Calculate gross rental yield percentage.
    """
    if property_value <= 0:
        return {"error": "Property value must be greater than zero"}
        
    annual_rent = monthly_rent * 12
    yield_percentage = (annual_rent / property_value) * 100
    
    return {
        "annual_rent": annual_rent,
        "property_value": property_value,
        "rental_yield_percentage": float(Decimal(str(yield_percentage)).quantize(Decimal('0.01')))
    }
