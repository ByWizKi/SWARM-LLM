# backend/my_model.py
from  torch import load, nn, sigmoid, no_grad, tensor, zeros, cat


def pad_list(lst, target_length=4):
    return lst[:target_length] + [23711] * (target_length - len(lst))#pour l'instant les drafts partielles ne sont pas généres, on met un monstre random à la place

# Exemple : ton réseau de neurones
def predict(model,model_infos,joueur_A,joueur_B):
    #model est le model torch, model_info est les infos necessaire pour le model, en particulier le mapping id-> vecteur
    joueur_A_pad = pad_list(joueur_A, 4)
    joueur_B_pad = pad_list(joueur_B, 4)
    input_dim,layers = model_infos["modele_name_and_param"]
    id_monstres = joueur_A_pad + joueur_B_pad
    with no_grad():
        x = tensor([model_infos["dict_mapp_index"][id] for id in id_monstres])
        j1 = x[:4].detach().clone()
        j2 = x[4:].detach().clone()
        one_hot_j1 = zeros(input_dim)
        one_hot_j1[j1] = 1
        one_hot_j2 = zeros(input_dim)
        one_hot_j2[j2] = 1
        x = cat((one_hot_j1,one_hot_j2))
        x = x.unsqueeze(0)
        logits = model(x)
        a,b = model_infos["calibration_proba"]
        y_probs_calibrated = sigmoid(a * logits + b)
        print("y_probs : " + str(float(y_probs_calibrated)))
        return float(y_probs_calibrated)
