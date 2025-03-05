from torch import cuda

INITIAL_COLOR = "rgb(59 130 246)"
"""Initial user color for the chat bubbles and UI,
inspired from Tailwind's bg-blue-500"""

MODEL_NAME = "stabilityai/stable-diffusion-2"
"""Name of the Hugging Face model that will be used"""

DEVICE = "cuda" if cuda.is_available() else "cpu"
"""Device that will process the compute, (cuda = GPU,
or cpu = CPU). Keep in mind that GPU processing tends
to be much more performant. Warning: CUDA drivers only
exist for Windows at this time"""
