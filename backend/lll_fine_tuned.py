# backend/my_model.py
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch.nn.functional as F
import torch
import random

def predict_nexts_monsters (model,tokenizer,pickA,pickB,availableMonster):

    #on va prédire les prochains picks de A en fonction de ce qui a déjà été fait dans pickA et pickB
    #Si availableMonster n'est pas la liste vite ou None, on renvoie que des monstres dans cette liste
    sampling = True #permet de choisir si on fait du sampling ou non 
    temperature = 0.1 #température pour le sampling
    debut_str = "Current draft state: Player A picks: "
    middle = "; Player B picks: " 
    end = "\nPredict next picks for Player A:"
    A_ids = pickA
    B_ids = pickB
    strA = ""
    for id in A_ids : 
        strA+="M"+str(id)+" "

    strB = ""
    for id in B_ids : 
        strB+="M"+str(id)+" "
    strB = strB[:-1]

    promt_final = debut_str+strA+middle+strB+end

    if ((availableMonster is None) or len(availableMonster)==0) : 
        inputs = tokenizer(promt_final, return_tensors="pt")
        model.eval()  # mettre en mode évaluation
        output = model.generate(
            **inputs,
            max_new_tokens=20,   # nombre de tokens à générer
            do_sample=False      # greedy generation (prévisible)
        )
        generated_text = tokenizer.decode(output[0], skip_special_tokens=True)
        ls_monster = generated_text.split("Predict next picks for Player A:")[1].strip().replace("M","").split(' ')
    else : 
        
        # Tokenisation des picks
        pick_token_available_ids = {
            pick: tokenizer.encode(pick, add_special_tokens=False)
            for pick in availableMonster
        }
        inputs = tokenizer(promt_final, return_tensors="pt")
        current_input_ids = inputs["input_ids"]




                
        allowed_picks = [23711, 16811, 28312, 23712, 17411, 26113, 21811, 28613, 16111, 16613, 21115, 30512, 21415, 24511, 16815, 15712, 25011, 24712, 26813, 21214, 18314, 17012, 31112, 16114, 14034, 20512, 13812]
        allowed_picks = [str(i) for i in allowed_picks]
        pick_token_ids = {
            pick: tokenizer.encode(pick, add_special_tokens=False)
            for pick in availableMonster
        }

        current_input_ids = inputs["input_ids"]
        max_gen_len = 30  # longueur max de génération

        forced_pick_ids = [] # tokens du pick en cours
        forced_step = 0      # Combien de token à forcer encore
        for _ in range(max_gen_len):
            with torch.no_grad():
                outputs = model(input_ids=current_input_ids)
                logits = outputs.logits[:, -1, :]
                probs = torch.softmax(logits, dim=-1)


            new_token_ids = torch.argmax(probs, dim=-1).item()
            if "M" in tokenizer.decode(torch.tensor([new_token_ids])) : 
                #si on voit un M on passe en génération forcé
                forced_step= 2
                # Ajouter le token
                current_input_ids = torch.cat(
                    [current_input_ids, torch.tensor([[new_token_ids]])],
                    dim=1
                )
                forced_pick_ids=[]
                continue
            
            if forced_step>0:
                # On force le token suivant du pick
                
                ls_ok = [token[-forced_step+2] for token in pick_token_ids.values()]#vaut 1 quand forced_step=1 et 0 quand forced_step = 2
                mask = torch.full_like(logits, float('-inf'))  # tout à -inf
                mask[0, ls_ok] = logits[0, ls_ok]  # ne garder que les autorisés
                #pour l'instant on essaye avec du greedy
                probs = torch.softmax(mask, dim=-1)
                probs_allowed = probs[0, ls_ok]
                #print(probs_allowed)
                if sampling and forced_step==2 : 
                    # Sampling
                    new_token_ids = torch.multinomial(torch.softmax(mask/temperature, dim=-1), num_samples=1).item()
                else : 
                    probs = torch.softmax(mask, dim=-1)
                    new_token_ids = torch.argmax(probs, dim=-1).item()
                current_input_ids = torch.cat(
                    [current_input_ids, torch.tensor([[new_token_ids]])],
                    dim=1
                )
                forced_pick_ids.append(new_token_ids)
                forced_step-=1
                if forced_step==0:
                    #on vient de finir une inférence, donc on supprime le monstre de la liste possible
                    for k in list(pick_token_ids.keys()) : 
                        if pick_token_ids[k] == forced_pick_ids:
                            del pick_token_ids[k]
                continue


            if new_token_ids==0 : 
                #on est sur le token de fin, on stop
                break 
            else:
                # Génération normale
                current_input_ids = torch.cat(
                    [current_input_ids, torch.tensor([[new_token_ids]])],
                    dim=1
                )
        generated_text = tokenizer.decode(current_input_ids[0])
        print(generated_text)
        ls_monster = generated_text.split("Predict next picks for Player A:")[1].strip().replace("M","").split(' ')



    monster_ok_playerA = []
    usable_monster = set(availableMonster)
    for id in ls_monster : 
        if (id in usable_monster) or (int(id) in usable_monster )or (str(id) in usable_monster ): 
            monster_ok_playerA.append(id)
            usable_monster.discard(id)
            usable_monster.discard(int(id))
            usable_monster.discard(str(id))
    
    #on vérifie maintenant que on a les bons monstres 
    if len(monster_ok_playerA)==2 : 
        return monster_ok_playerA
    
    if len(monster_ok_playerA)==1 and (len(pickA)==len(pickB)==0 or (len(pickA)==4 and len(pickB)==5)) : 
        #on vérifie que on a bien besoin que de 1 seul pick début de draft et fin de draft 
        return monster_ok_playerA
    
    #maintenant que ya un pb on va prendre des monstres au hasard pour compléter
    if len(monster_ok_playerA)==1 : 
        print("------------Un monstre ajouté au hazard------------")
        return (random.sample(list(usable_monster),1) + monster_ok_playerA)

    else : 
        print("------------Tous les monstres ajoutés au hazard------------")
        print("Monstres initiaux " + str(ls_monster))
        return random.sample(list(usable_monster),2)