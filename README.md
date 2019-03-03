Intro
=====

This module is heavily inspired by the pam-http module by Kragen Sitaker. I rewrote it largely because I wanted to MIT license it (instead of GPL) and because there was some profanity in the source.  Also, the version I modeled this off of didn't even compile because it used an old version of libcurl.

This works with libcurl v. 7.21.3 (the one in Ubuntu's repositories).

To build, just type `make`. It will create `mypam.so` and a `test` executable.

Simple Usage
------------

The .so file should be put in `/lib/security` and the PAM config files will need to be edited accordingly.

The config files are located in `/etc/pam.d/` and the one I changed was `/etc/pam.d/common-auth`. This is NOT the best place to put it, as sudo uses this file and you could get unexpected results (like an HTTP user could gain root access; cool huh?).

Put something like this in one of the config files (change the URL to whatever you like):

	auth sufficient mypam.so url=https://localhost:2000
	account sufficient mypam.so

Sufficient basically means that if this authentication method succeeds, the user is given access.

To test, run the test program with a single argument, the username. I have provided a sample HTTPS server (you'll need your own certificate) that will accept all usernames and passwords. This module does not check the validity of certificates, so a custom one will do.

Fixing issues with SELinux
--------------------------

On some systems you might run into problems with SELinux denying the software to make a request to another server. You might want to create your own policy to allow this. In this example I will show you how to first debug this issue and then how to fix it, when you want to use pam-http with the dovecot mail server running under CentOS. Depending on your use case you might need to adapt a few things.

After a failed attempt to use pam-http through dovecot, get the latest policy violations using

    sudo ausearch -m avc -ts recent

The result should look simmilar to this:

    ----
    time->Sun Mar  3 18:54:18 2019
    type=PROCTITLE msg=audit(1551639258.416:681466): proctitle=646F7665636F742F61757468002D77
    type=SYSCALL msg=audit(1551639258.416:681466): arch=c000003e syscall=2 success=no exit=-13 a0=557308470410 a1=80042 a2=1a4 a3=557308470410 items=0 ppid=5026 pid=6564 auid=4294967295 uid=0 gid=0 euid=0 suid=0 fsuid=0 egid=0 sgid=0 fsgid=0 tty=(none) ses=4294967295 comm="auth" exe="/usr/libexec/dovecot/auth" subj=system_u:system_r:dovecot_auth_t:s0 key=(null)
    type=AVC msg=audit(1551639258.416:681466): avc:  denied  { write } for  pid=6564 comm="auth" name="cert9.db" dev="vda1" ino=12611744 scontext=system_u:system_r:dovecot_auth_t:s0 tcontext=system_u:object_r:cert_t:s0 tclass=file
    ----
    time->Sun Mar  3 18:54:18 2019
    type=PROCTITLE msg=audit(1551639258.447:681467): proctitle=646F7665636F742F61757468002D77
    type=SYSCALL msg=audit(1551639258.447:681467): arch=c000003e syscall=2 success=no exit=-13 a0=557308481430 a1=80042 a2=1a4 a3=557308481430 items=0 ppid=5026 pid=6564 auid=4294967295 uid=0 gid=0 euid=0 suid=0 fsuid=0 egid=0 sgid=0 fsgid=0 tty=(none) ses=4294967295 comm="auth" exe="/usr/libexec/dovecot/auth" subj=system_u:system_r:dovecot_auth_t:s0 key=(null)
    type=AVC msg=audit(1551639258.447:681467): avc:  denied  { write } for  pid=6564 comm="auth" name="key4.db" dev="vda1" ino=12611746 scontext=system_u:system_r:dovecot_auth_t:s0 tcontext=system_u:object_r:cert_t:s0 tclass=file
    ----
    time->Sun Mar  3 18:57:34 2019
    type=PROCTITLE msg=audit(1551639454.224:681531): proctitle=646F7665636F742F61757468002D77
    type=SYSCALL msg=audit(1551639454.224:681531): arch=c000003e syscall=42 success=no exit=-13 a0=7 a1=7fffdd4cf9b0 a2=10 a3=5bdc items=0 ppid=5026 pid=6759 auid=4294967295 uid=0 gid=0 euid=0 suid=0 fsuid=0 egid=0 sgid=0 fsgid=0 tty=(none) ses=4294967295 comm="auth" exe="/usr/libexec/dovecot/auth" subj=system_u:system_r:dovecot_auth_t:s0 key=(null)
    type=AVC msg=audit(1551639454.224:681531): avc:  denied  { name_connect } for  pid=6759 comm="auth" dest=443 scontext=system_u:system_r:dovecot_auth_t:s0 tcontext=system_u:object_r:http_port_t:s0 tclass=tcp_socket
 
 You can ask SELinux which policies you need to change to fix the problem(s) by calling `sudo audit2allow -a`. In case of dovecot the result looks like this:
 
     
     #============= dovecot_auth_t ==============
     allow dovecot_auth_t cert_t:dir write;
     allow dovecot_auth_t cert_t:file write;
     
     #!!!! This avc can be allowed using the boolean 'nis_enabled'
     allow dovecot_auth_t http_port_t:tcp_socket name_connect;

You can pipe this into `audit2why` to see if you can fix this by setting a simple boolean in SELinux.

For dovecot this does not work. You can create your own policy to work around this issue however:

    yum install selinux-policy-devel
    cd semodule
    make -f /usr/share/selinux/devel/Makefile mypolicy.pp
    sudo semodule -i mypolicy.pp
    sudo setsebool -P dovecot_can_http_connect on
    getsebool -a | grep dovecot_can_http_connect
 
 To adapt this to another software you need to modify the file `mypolicy.te` in the folder `selinux`.
