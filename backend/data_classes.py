class SpeechRateConversions:
    RATES_TO_PERCENTAGES = {
        "1.25X": 25,
        "1.5X": 50,
        "1.75X": 75,
        "2X": 100,
    }

    @classmethod
    def get_percentage_increase(cls, rate):
        normalized_rate = rate.upper()
        return cls.RATES_TO_PERCENTAGES.get(normalized_rate, None)