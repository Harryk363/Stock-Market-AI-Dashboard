from backend.model_runner import run_prediction


def main():
    print("=" * 60)
    print("        STOCK MARKET AI - PREDICTION")
    print("=" * 60)

    symbol = input("Enter stock symbol (e.g. AAPL): ").strip().upper()

    if not symbol:
        print("Error: Stock symbol cannot be empty.")
        return

    print("\nSelect prediction model:")
    print("1. XGBoost")
    print("2. LightGBM")
    print("3. Random Forest")

    model_choice = input("Enter model number [1]: ").strip() or "1"

    if model_choice not in {"1", "2", "3"}:
        print("Invalid model selection. Using XGBoost.")
        model_choice = "1"

    print("\nSelect historical period:")
    print("1. 1 Year")
    print("2. 2 Years")
    print("3. 5 Years")
    print("4. 10 Years")

    period_options = {
        "1": "1y",
        "2": "2y",
        "3": "5y",
        "4": "10y",
    }
    

    period_choice = input("Enter period number [3]: ").strip() or "3"
    period = period_options.get(period_choice, "5y")

    print("\nRunning prediction...")
    print("Please wait while market data and financial sentiment are analyzed.\n")

    try:
        result = run_prediction(
            symbol=symbol,
            model_choice=model_choice,
            period=period,
        )

        print("=" * 60)
        print("                 RESULTS")
        print("=" * 60)

        print(f"\nStock: {result['symbol']}")

        prediction = result.get("prediction", {})

        print(
            f"Prediction: "
            f"{prediction.get('label', 'N/A')}"
        )

        print(
            f"Probability: "
            f"{prediction.get('probability', 0):.2%}"
        )

        combined = result.get("combined", {})

        print(
            f"Combined Score: "
            f"{combined.get('score', 0):.4f}"
        )

        sentiment = result.get("sentiment", {})

        print(
            f"Sentiment: "
            f"{sentiment.get('label', 'N/A')}"
        )

        print(
            f"Sentiment Score: "
            f"{sentiment.get('score', 0):.4f}"
        )

        metrics = result.get("metrics", {})

        print("\nModel Performance:")
        print(
            f"Accuracy:  "
            f"{metrics.get('accuracy', 0):.2%}"
        )
        print(
            f"Precision: "
            f"{metrics.get('precision', 0):.2%}"
        )
        print(
            f"Recall:    "
            f"{metrics.get('recall', 0):.2%}"
        )
        print(
            f"F1 Score:  "
            f"{metrics.get('f1', 0):.2%}"
        )

        print("\n" + "=" * 60)
        print("Prediction completed.")
        print("=" * 60)

    except Exception as exc:
        print("\nPrediction failed.")
        print(f"Error: {exc}")


if __name__ == "__main__":
    main()