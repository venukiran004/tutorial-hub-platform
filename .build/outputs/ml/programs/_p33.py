from sklearn.manifold import TSNE
from sklearn.datasets import load_digits
import numpy as np

X, y = load_digits(return_X_y=True)
tsne = TSNE(n_components=2, random_state=42, perplexity=30)
X_2d = tsne.fit_transform(X)
print(f"Original shape: {X.shape}")
print(f"t-SNE shape: {X_2d.shape}")
print(f"Sample 2D coords: {X_2d[:3]}")
