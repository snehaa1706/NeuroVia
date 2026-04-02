# Mock for pyiceberg to bypass build failures on Windows/Python 3.14
class RestCatalog:
    def __init__(self, *args, **kwargs):
        pass
