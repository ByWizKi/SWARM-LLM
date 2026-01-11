from fastapi import FastAPI
from pydantic import BaseModel
from pydantic import Field
from typing import List
from torch import load, nn, sigmoid, no_grad, tensor, zeros, cat
from my_model import predict
from itertools import combinations
import json
import random
from fastapi import Response

app = FastAPI(title="SWARM-LLM Python API")

class DraftState(BaseModel):
    playerAPicks: List[int]
    playerBPicks: List[int]
    playerABans: List[int] = Field(default_factory=list)
    playerBBans: List[int] = Field(default_factory=list)
    currentPhase: str
    playerAAvailableIds: List[int]
    playerBPossibleCounter : List[int]

class SimpleDraftModel_one_hot(nn.Module):
    def __init__(self, input_dim, hidden_dims=[64, 32]):
        #input dim c'est la dimension du one-hot
        super().__init__()
        input_dim = 2*input_dim  # 2 joueurs
        layers = []
        last_dim = input_dim
        for h in hidden_dims:
            layers.append(nn.Linear(last_dim, h))
            layers.append(nn.ReLU())
            last_dim = h
        layers.append(nn.Linear(last_dim, 1))
        self.mlp = nn.Sequential(*layers)
        
    def forward(self, x):
        # x shape: (batch_size, 2* embed_dim)
        #chaque joueur à un vecteur de taille embed_dim
        y = self.mlp(x)
        return y.squeeze(1)



@app.on_event("startup")
def load_model():
    global model
    global model_infos
    global monsters
    print("📦 Chargement du modèle PyTorch...")
    model_infos = load("modele_predic.pt", map_location="cpu")
    input_dim,layers = model_infos["modele_name_and_param"]
    model = SimpleDraftModel_one_hot(input_dim,layers)
    model.load_state_dict(model_infos["modele_nn"])
    model.eval()
    print(" Modèle chargé")
    print("Chargement des monstres")
    with open("monsters_rta.json") as f:
        liste_data_rta = json.load(f)
    monsters = {monster["id"]:monster for monster in liste_data_rta}
    print("Monstres chargés ")


@app.post("/neural-net")
async def get_neural_net_context(draft_state: DraftState):
    # TODO : remplacer par ton réseau de neurones
    context = (f"Contexte généré pour picks {draft_state.playerAPicks} vs {draft_state.playerBPicks}\n"
    f"le joueur A à comme choix : {draft_state.playerAAvailableIds} et le joueur B à comme counter possible : {draft_state.playerBPossibleCounter}" 
    )
    print(context)
    #on utilise le model : 
    all_pairs = list(combinations(draft_state.playerAAvailableIds, 2))
    num_to_take = len(draft_state.playerAAvailableIds)
    # calculer les scores
    scores = []
    for a, b in random.sample(all_pairs, min(num_to_take, len(all_pairs))):
        sortie = predict(model,model_infos,draft_state.playerAPicks+[a,b],draft_state.playerBPicks)
        scores.append((a, b, sortie))

    # trier par score croissant
    scores.sort(key=lambda x: x[2])
    # construire la chaîne finale avec les scores affichés par ordre croissant
    lines = ["Info neural network sur le choix des monstres pour JA : "] 
    for a, b, sortie in scores:
        lines.append(f'Si JA pick : {monsters[a]["name"]} et {monsters[b]["name"]}, proba win : {sortie:.4f} ')
    context_str = "\n".join(lines)
    return Response(content=context_str, media_type="text/plain")
