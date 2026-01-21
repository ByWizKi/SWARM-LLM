# backend/my_model.py
from  torch import load, nn, sigmoid, no_grad, tensor, zeros, cat
from itertools import permutations

def pad_list(lst, target_length=4):
    return lst[:target_length] + [0] * (target_length - len(lst))#pour l'instant les drafts partielles ne sont pas généres, on met un monstre random à la place

# Exemple : ton réseau de neurones
def predict(model,model_infos,joueur_A,joueur_B):
    #model est le model torch, model_info est les infos necessaire pour le model, en particulier le mapping id-> vecteur
    joueur_A_pad = pad_list(joueur_A, 4)
    joueur_B_pad = pad_list(joueur_B, 4)
    input_dim,layers = model_infos["modele_name_and_param"]
    id_monstres = joueur_A_pad + joueur_B_pad
    with no_grad():
        x = tensor([model_infos["dict_mapp_index"].get(id,0) for id in id_monstres])
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


def predict_one(model,model_infos,joueur_A,joueur_B,joueurA_available):
    #on prédit le premier monstre pour jA
    #on renvoye le tuple id,proba
    print("predict_one")
    joueur_B_pad = pad_list(joueur_B, 4)
    input_dim,layers = model_infos["modele_name_and_param"]
    id_choice,max_proba = 0,0.
    for monster_id in joueurA_available:
        joueur_A_pad = pad_list([monster_id], 4)
        id_monstres = joueur_A_pad + joueur_B_pad
        with no_grad():
            x = tensor([model_infos["dict_mapp_index"].get(id,0) for id in id_monstres])
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
            if y_probs_calibrated>max_proba:
                max_proba=y_probs_calibrated
                id_choice=monster_id
    return id_choice,float(max_proba)

def predict_two_complete(model,model_infos,joueur_A,joueur_B,joueurA_available):
    print("predict_two_complete")

    all_pairs = list(permutations(joueurA_available, 2))
    joueur_B_pad = pad_list(joueur_B, 4)
    input_dim,layers = model_infos["modele_name_and_param"]
    id_choice1,id_choice2,max_proba = 0,0,0.
    for m1,m2 in all_pairs:
        joueur_A_pad = pad_list(joueur_A+[m1,m2], 4)
        id_monstres = joueur_A_pad + joueur_B_pad
        with no_grad():
            x = tensor([model_infos["dict_mapp_index"].get(id,0) for id in id_monstres])
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
            if y_probs_calibrated>max_proba:
                max_proba=y_probs_calibrated
                id_choice1,id_choice2=m1,m2
    return id_choice1,id_choice2,float(max_proba)


def predict_one_contrainte(model,model_infos,joueur_A,joueur_B,joueurA_available):
    #on prédit le dernier monstre pour jA
    #on renvoye le tuple id,proba
    print("predict_one_contrainte")
    input_dim,layers = model_infos["modele_name_and_param"]
    id_choice,max_proba = 0,0.
    for new_id in joueurA_available:
        proba_pire_cas = 0.
        for indice_B in range(5):
            joueur_B_pad = [ms_id for i,ms_id in enumerate(joueur_B) if i!=indice_B] #On enlève un monstre pour B
            min_for_ban=1
            for indice_A in range(5):
                joueur_A_pad = [ms_id for i,ms_id in enumerate(joueur_A+[new_id]) if i!=indice_A] #On enlève un monstre pour A
                id_monstres = joueur_A_pad + joueur_B_pad
                with no_grad():
                    x = tensor([model_infos["dict_mapp_index"].get(id,0) for id in id_monstres])
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
                    if y_probs_calibrated<min_for_ban:
                        min_for_ban=y_probs_calibrated
            #on a la proba min pour le ban, 
            if min_for_ban>proba_pire_cas:
                proba_pire_cas = min_for_ban
        if proba_pire_cas>max_proba:
            max_proba = proba_pire_cas
            id_choice = new_id
    return id_choice,float(max_proba)
 
def predict_two_contrainte(model,model_infos,joueur_A,joueur_B,joueurA_available):
    #on prédit les deux derniers monstre pour jA
    #on renvoye le tuple id,proba
    all_pairs = list(permutations(joueurA_available, 2))
    print("predict_two_contrainte")
    input_dim,layers = model_infos["modele_name_and_param"]
    id1,id2,max_proba = 0,0,0.
    joueur_B_pad = pad_list(joueur_B, 4) 
    for m1,m2 in all_pairs:
        proba_pire_cas = 0.
        min_for_ban=1
        for indice_A in range(5):
            joueur_A_pad = [ms_id for i,ms_id in enumerate(joueur_A+[m1,m2]) if i!=indice_A] #On enlève un monstre pour A
            id_monstres = joueur_A_pad + joueur_B_pad
            with no_grad():
                x = tensor([model_infos["dict_mapp_index"].get(id,0) for id in id_monstres])
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
                if y_probs_calibrated<min_for_ban:
                    min_for_ban=y_probs_calibrated
        #on a la proba min pour le ban, 
        if min_for_ban>proba_pire_cas:
            proba_pire_cas = min_for_ban
    if proba_pire_cas>max_proba:
        max_proba = proba_pire_cas
        id1,id2 = m1,m2
    return id1,id2,float(max_proba)


def predict_ban(model,model_infos,joueur_A,joueur_B):
    #on prédit le ban pour jA JA et JB font 5 en taille 
    #on renvoye le tuple id,proba
    print("predict_ban")
    input_dim,layers = model_infos["modele_name_and_param"]
    id_choice,max_proba = 0,0.
    for indice_B in range(5):
        joueur_B_pad = [ms_id for i,ms_id in enumerate(joueur_B) if i!=indice_B] #On enlève un monstre pour B
        min_for_ban=1
        for indice_A in range(5):
            joueur_A_pad = [ms_id for i,ms_id in enumerate(joueur_A) if i!=indice_A] #On enlève un monstre pour A

            id_monstres = joueur_A_pad + joueur_B_pad
            with no_grad():
                x = tensor([model_infos["dict_mapp_index"].get(id,0) for id in id_monstres])
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
                if y_probs_calibrated<min_for_ban:
                    min_for_ban=y_probs_calibrated
        #on a la proba min pour le ban, 
        if min_for_ban>max_proba:
            max_proba = min_for_ban
            id_choice = joueur_B[indice_B]
    return id_choice,float(max_proba)
