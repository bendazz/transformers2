import torch                                                                                                                                          
import torch.nn as nn                                     

vocab_size = 27   # 26 letters + space                                                                                                                
embed_dim = 4
embedding = nn.Embedding(vocab_size, embed_dim)                                                                                                       
                                                        
tokens = torch.tensor([7,2])   # "hello"                                                                                                 
vectors = embedding(tokens)
print(vectors.shape)   # torch.Size([5, 4])                                                                                                           
print(vectors.tolist()) 