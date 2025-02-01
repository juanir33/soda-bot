# predict_depletion.py
import sys
import json
from datetime import datetime, timedelta
from sklearn.linear_model import LinearRegression
import numpy as np


def predict_gas_depletion(data):
    base_date = datetime.strptime(data[0]['date'], '%Y-%m-%dT%H:%M:%S.%fZ')
    dates = np.array([(datetime.strptime(entry['date'], '%Y-%m-%dT%H:%M:%S.%fZ') - base_date).total_seconds() / (60 * 60 * 24) for entry in data]).reshape(-1, 1)
    gas_levels = np.array([entry['remaining'] for entry in data])

    # Entrenar el modelo de regresión lineal
    model = LinearRegression().fit(dates, gas_levels)
    
   
    # Verificar si la pendiente es demasiado pequeña
    if abs(model.coef_[0]) < 1e-6:  # Umbral pequeño para pendientes casi nulas
        return "No se puede hacer una predicción: los datos son constantes o insuficientes."

    # Calcular el día en que el gas llegará a 0
    depletion_day = -model.intercept_ / model.coef_[0]

    # Convertir el día ordinal de vuelta a una fecha
    depletion_date = base_date + timedelta(days=depletion_day)
    return depletion_date.strftime('%Y-%m-%d')
   
    

if __name__ == "__main__":
    # Leer datos JSON desde la entrada estándar (stdin)
    input_data = sys.stdin.read()
    data = json.loads(input_data)
    
    # Realizar la predicción y devolver el resultado
    result = predict_gas_depletion(data)
    print(result)
